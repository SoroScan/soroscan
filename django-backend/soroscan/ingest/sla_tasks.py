"""
Celery tasks for Event Completeness SLA tracking.
"""

import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from celery import shared_task
from django.core.mail import send_mail
from django.db.models import Sum
from django.utils import timezone

from .models import TrackedContract, ContractEvent
from .sla_models import (
    EventCompletenessMetric,
    SLAViolation,
    SLAConfiguration,
)

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
    time_limit=1800,  # 30 minutes
)
def calculate_hourly_sla_metrics(self):
    """
    Calculate event completeness metrics for all tracked contracts (hourly).
    Run this task once per hour via Celery Beat.
    
    - Detect missing events
    - Calculate completeness %
    - Identify SLA violations
    - Send alerts if configured
    """
    try:
        # Get the hour to calculate (current hour UTC)
        now = timezone.now()
        # Round down to the start of the hour
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        
        logger.info(f"Starting SLA metric calculation for hour {hour_start}")
        
        contracts = TrackedContract.objects.filter(is_active=True)
        metrics_created = 0
        violations_created = 0
        
        for contract in contracts:
            try:
                # Get SLA config for this contract
                sla_config = SLAConfiguration.objects.filter(
                    contract=contract,
                    is_enabled=True,
                ).first()
                
                if not sla_config:
                    # Create default config if not exists
                    sla_config = SLAConfiguration.objects.get_or_create(
                        contract=contract,
                    )[0]
                
                # Calculate events for this hour
                events_indexed = ContractEvent.objects.filter(
                    contract=contract,
                    indexed_at__gte=hour_start,
                    indexed_at__lt=hour_start + timedelta(hours=1),
                ).count()
                
                # TODO: Query Horizon or on-chain data to get total_emitted
                # For now, assume we get this from event logs or chain state
                total_emitted = get_emitted_events_for_hour(contract, hour_start)
                
                # Calculate completeness
                if total_emitted > 0:
                    completeness = (min(events_indexed, total_emitted) / total_emitted) * 100
                    missing = total_emitted - events_indexed
                else:
                    completeness = 100.0
                    missing = 0
                
                # Create or update metric
                metric, created = EventCompletenessMetric.objects.update_or_create(
                    contract=contract,
                    hour=hour_start,
                    defaults={
                        "total_emitted": total_emitted,
                        "total_indexed": events_indexed,
                        "completeness_percent": Decimal(str(completeness)),
                        "missing_events": missing,
                        "sla_breached": completeness < float(sla_config.completeness_threshold_percent),
                    },
                )
                
                if created:
                    metrics_created += 1
                
                # Check if SLA was violated
                if metric.sla_breached and metric.completeness_percent < sla_config.completeness_threshold_percent:
                    violation, v_created = SLAViolation.objects.get_or_create(
                        contract=contract,
                        violation_hour=hour_start,
                        defaults={
                            "expected_completeness_percent": sla_config.completeness_threshold_percent,
                            "actual_completeness_percent": metric.completeness_percent,
                            "events_missing": metric.missing_events,
                            "severity": get_severity(metric.completeness_percent),
                        },
                    )
                    
                    if v_created:
                        violations_created += 1
                        
                        # Send alert if configured
                        if sla_config.alert_on_violation:
                            send_sla_violation_alert.delay(violation.id)
                
                logger.info(
                    f"SLA metrics for {contract.name}: "
                    f"{metric.completeness_percent}% "
                    f"({events_indexed}/{total_emitted})"
                )
                
            except Exception as e:
                logger.exception(f"Error calculating SLA for contract {contract.id}: {e}")
                continue
        
        logger.info(
            f"SLA calculation complete: "
            f"{metrics_created} metrics created, "
            f"{violations_created} violations detected"
        )
        
    except Exception as e:
        logger.exception(f"Error in calculate_hourly_sla_metrics: {e}")
        self.retry(exc=e)


@shared_task
def send_sla_violation_alert(violation_id):
    """
    Send an alert for an SLA violation.
    Supports Slack, email, and webhook channels.
    """
    try:
        violation = SLAViolation.objects.get(id=violation_id)
        config = violation.contract.sla_config
        
        if not config.alert_on_violation:
            return
        
        message = format_violation_alert(violation)
        
        for channel in config.alert_channels:
            channel_type = channel.get("type")
            target = channel.get("target")
            
            if channel_type == "email":
                send_mail(
                    subject=f"⚠️ SLA Violation: {violation.contract.name}",
                    message=message,
                    from_email="alerts@soroscan.io",
                    recipient_list=[target],
                    fail_silently=True,
                )
            elif channel_type == "slack":
                send_slack_alert(target, message, violation)
            elif channel_type == "webhook":
                send_webhook_alert(target, violation)
        
        violation.alert_sent = True
        violation.save()
        
    except SLAViolation.DoesNotExist:
        logger.error(f"SLA violation {violation_id} not found")
    except Exception as e:
        logger.exception(f"Error sending SLA alert: {e}")


def get_emitted_events_for_hour(contract, hour_start):
    """
    Get the total number of events emitted by the contract during an hour.
    This queries Horizon or on-chain data.
    
    TODO: Implement actual chain query logic.
    For now, returns a placeholder.
    """
    # This is a placeholder - implement actual chain querying
    # Could query Horizon operations, RPC, or use an external indexer
    return 0  # Placeholder


def get_severity(completeness_percent):
    """Determine severity level based on completeness percentage."""
    if completeness_percent >= 99:
        return "low"
    elif completeness_percent >= 95:
        return "medium"
    elif completeness_percent >= 90:
        return "high"
    else:
        return "critical"


def format_violation_alert(violation):
    """Format a human-readable alert message for SLA violation."""
    return (
        f"🚨 SLA VIOLATION ALERT\n\n"
        f"Contract: {violation.contract.name}\n"
        f"Time: {violation.violation_hour.isoformat()}\n"
        f"Expected: {violation.expected_completeness_percent}%\n"
        f"Actual: {violation.actual_completeness_percent}%\n"
        f"Missing Events: {violation.events_missing}\n"
        f"Severity: {violation.get_severity_display()}"
    )


def send_slack_alert(webhook_url, message, violation):
    """Send alert to Slack channel via webhook."""
    try:
        import requests
        
        payload = {
            "text": "🚨 SLA Violation Alert",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*SLA Violation Detected*\n"
                            f"Contract: `{violation.contract.name}`\n"
                            f"Expected: `{violation.expected_completeness_percent}%`\n"
                            f"Actual: `{violation.actual_completeness_percent}%`\n"
                            f"Missing: `{violation.events_missing}` events"
                        ),
                    },
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Time: {violation.violation_hour.isoformat()}",
                        },
                    ],
                },
            ],
        }
        
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        
    except Exception as e:
        logger.exception(f"Error sending Slack alert: {e}")


def send_webhook_alert(webhook_url, violation):
    """Send alert to custom webhook."""
    try:
        import requests
        
        payload = {
            "type": "sla_violation",
            "contract_id": violation.contract.contract_id,
            "contract_name": violation.contract.name,
            "violation_hour": violation.violation_hour.isoformat(),
            "expected_completeness": float(violation.expected_completeness_percent),
            "actual_completeness": float(violation.actual_completeness_percent),
            "missing_events": violation.events_missing,
            "severity": violation.severity,
        }
        
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        
    except Exception as e:
        logger.exception(f"Error sending webhook alert: {e}")
