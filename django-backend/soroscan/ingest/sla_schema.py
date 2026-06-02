"""GraphQL schema for Event Completeness SLA tracking."""

from datetime import datetime
from typing import List, Optional

import strawberry
import strawberry_django
from strawberry import auto

from .sla_models import (
    EventCompletenessMetric,
    SLAViolation,
    SLAConfiguration,
)


@strawberry_django.type(EventCompletenessMetric)
class EventCompletenessMetricType:
    id: auto
    contract_id: auto
    hour: auto
    total_emitted: auto
    total_indexed: auto
    completeness_percent: auto
    missing_events: auto
    sla_breached: auto
    metadata: strawberry.scalars.JSON
    created_at: auto

    @strawberry.field
    def contract_name(self) -> str:
        return self.contract.name


@strawberry_django.type(SLAViolation)
class SLAViolationType:
    id: auto
    contract_id: auto
    violation_hour: auto
    expected_completeness_percent: auto
    actual_completeness_percent: auto
    events_missing: auto
    status: auto
    root_cause: auto
    severity: auto
    alert_sent: auto
    created_at: auto
    resolved_at: Optional[auto]

    @strawberry.field
    def contract_name(self) -> str:
        return self.contract.name

    @strawberry.field
    def duration_minutes(self) -> int:
        """Minutes since violation was created."""
        from django.utils import timezone
        return int((timezone.now() - self.created_at).total_seconds() / 60)


@strawberry_django.type(SLAConfiguration)
class SLAConfigurationType:
    id: auto
    contract_id: auto
    completeness_threshold_percent: auto
    calculation_window_hours: auto
    alert_on_violation: auto
    alert_channels: strawberry.scalars.JSON
    is_enabled: auto
    created_at: auto
    updated_at: auto

    @strawberry.field
    def contract_name(self) -> str:
        return self.contract.name


@strawberry.type
class SLADashboardStats:
    """Aggregated SLA statistics for dashboard display."""
    
    total_contracts_tracked: int
    contracts_with_sla_enabled: int
    violations_this_week: int
    violations_unresolved: int
    average_completeness_percent: float
    contracts_below_threshold: int
    critical_violations: int


@strawberry.type
class ContractSLASnapshot:
    """Current SLA status for a single contract."""
    
    contract_id: str
    contract_name: str
    completeness_percent: float
    threshold_percent: float
    status: str  # "compliant", "warning", "violation"
    latest_metric_hour: datetime
    violations_this_week: int
    violations_unresolved: int
    alert_configured: bool


@strawberry.type
class SLAHistoryPoint:
    """Single point in SLA history time series."""
    
    hour: datetime
    completeness_percent: float
    events_indexed: int
    events_emitted: int
    missing_events: int
    sla_breached: bool


# Query extensions (to be added to main Query type)
@strawberry.type
class SLAQueries:
    """SLA-related GraphQL queries."""
    
    @strawberry.field
    def sla_dashboard_stats(self) -> SLADashboardStats:
        """Get aggregated SLA statistics for dashboard."""
        from django.db.models import Q, Count, Avg
        from .models import TrackedContract
        
        total_contracts = TrackedContract.objects.filter(is_active=True).count()
        contracts_with_sla = SLAConfiguration.objects.filter(is_enabled=True).count()
        
        violations = SLAViolation.objects.filter(
            created_at__gte=datetime.now(tz=None) - __import__('datetime').timedelta(days=7)
        )
        violations_unresolved = violations.filter(status="open").count()
        
        metrics = EventCompletenessMetric.objects.all()
        avg_completeness = metrics.aggregate(Avg('completeness_percent'))['completeness_percent__avg'] or 100
        
        critical_violations = SLAViolation.objects.filter(severity="critical", status="open").count()
        
        below_threshold = EventCompletenessMetric.objects.filter(sla_breached=True).count()
        
        return SLADashboardStats(
            total_contracts_tracked=total_contracts,
            contracts_with_sla_enabled=contracts_with_sla,
            violations_this_week=violations.count(),
            violations_unresolved=violations_unresolved,
            average_completeness_percent=float(avg_completeness),
            contracts_below_threshold=below_threshold,
            critical_violations=critical_violations,
        )
    
    @strawberry.field
    def contract_sla_snapshot(self, contract_id: str) -> Optional[ContractSLASnapshot]:
        """Get current SLA status for a specific contract."""
        from .models import TrackedContract
        
        try:
            contract = TrackedContract.objects.get(contract_id=contract_id)
        except TrackedContract.DoesNotExist:
            return None
        
        config = SLAConfiguration.objects.filter(contract=contract).first()
        metric = EventCompletenessMetric.objects.filter(
            contract=contract
        ).order_by('-hour').first()
        
        if not metric:
            return None
        
        violations_week = SLAViolation.objects.filter(
            contract=contract,
            created_at__gte=datetime.now(tz=None) - __import__('datetime').timedelta(days=7),
        ).count()
        violations_unresolved = SLAViolation.objects.filter(
            contract=contract,
            status="open",
        ).count()
        
        threshold = float(config.completeness_threshold_percent) if config else 99.5
        completeness = float(metric.completeness_percent)
        
        if completeness >= threshold:
            status = "compliant"
        elif completeness >= threshold - 1:
            status = "warning"
        else:
            status = "violation"
        
        return ContractSLASnapshot(
            contract_id=contract.contract_id,
            contract_name=contract.name,
            completeness_percent=completeness,
            threshold_percent=threshold,
            status=status,
            latest_metric_hour=metric.hour,
            violations_this_week=violations_week,
            violations_unresolved=violations_unresolved,
            alert_configured=config.alert_on_violation if config else False,
        )
    
    @strawberry.field
    def contract_sla_history(
        self,
        contract_id: str,
        hours: int = 24,
    ) -> List[SLAHistoryPoint]:
        """Get SLA history for a contract over last N hours."""
        from .models import TrackedContract
        from django.utils import timezone
        from datetime import timedelta
        
        try:
            contract = TrackedContract.objects.get(contract_id=contract_id)
        except TrackedContract.DoesNotExist:
            return []
        
        since = timezone.now() - timedelta(hours=hours)
        metrics = EventCompletenessMetric.objects.filter(
            contract=contract,
            hour__gte=since,
        ).order_by('hour')
        
        return [
            SLAHistoryPoint(
                hour=m.hour,
                completeness_percent=float(m.completeness_percent),
                events_indexed=m.total_indexed,
                events_emitted=m.total_emitted,
                missing_events=m.missing_events,
                sla_breached=m.sla_breached,
            )
            for m in metrics
        ]
    
    @strawberry.field
    def sla_violations(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[SLAViolationType]:
        """Get recent SLA violations, optionally filtered."""
        from .models import TrackedContract
        
        violations = SLAViolation.objects.select_related('contract').order_by('-violation_hour')
        
        if status:
            violations = violations.filter(status=status)
        if severity:
            violations = violations.filter(severity=severity)
        
        return list(violations[:limit])
