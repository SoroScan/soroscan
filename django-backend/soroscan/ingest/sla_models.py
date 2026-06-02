"""
Event Completeness SLA Tracking Models

Tracks how often we completely index all events emitted by contracts.
"""
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from soroscan.ingest.models import TrackedContract


class EventCompletenessMetric(models.Model):
    """
    Hourly snapshot of event completeness for a contract.
    Tracks what % of events we successfully indexed vs what was emitted.
    """

    contract = models.ForeignKey(
        TrackedContract,
        on_delete=models.CASCADE,
        related_name="completeness_metrics",
    )
    
    # Time bucket (start of the hour in UTC)
    hour = models.DateTimeField(db_index=True)
    
    # Event counts
    total_emitted = models.PositiveIntegerField(
        default=0,
        help_text="Total events emitted by contract in this hour (from chain)",
    )
    total_indexed = models.PositiveIntegerField(
        default=0,
        help_text="Total events successfully indexed in this hour",
    )
    
    # Derived metric
    completeness_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage of emitted events that were indexed (0-100)",
    )
    
    # Missing events
    missing_events = models.PositiveIntegerField(
        default=0,
        help_text="Count of events detected as missing",
    )
    missing_event_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="List of event IDs that were detected as missing",
    )
    
    # Status
    sla_breached = models.BooleanField(
        default=False,
        help_text="Whether this hour breached SLA threshold",
    )
    
    # Details
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (detection method, error details, etc)",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-hour"]
        unique_together = [("contract", "hour")]
        indexes = [
            models.Index(fields=["contract", "hour"]),
            models.Index(fields=["sla_breached", "hour"]),
        ]

    def save(self, *args, **kwargs):
        """Auto-calculate completeness_percent and missing_events."""
        if self.total_emitted > 0:
            indexed = min(self.total_indexed, self.total_emitted)
            self.completeness_percent = (indexed / self.total_emitted) * 100
            self.missing_events = self.total_emitted - indexed
        else:
            # If no events were emitted, completeness is 100%
            self.completeness_percent = 100
            self.missing_events = 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.contract.name} @ {self.hour}: {self.completeness_percent}%"


class SLAViolation(models.Model):
    """
    Record of SLA violations (when completeness drops below threshold).
    Used for alerting and historical tracking.
    """

    contract = models.ForeignKey(
        TrackedContract,
        on_delete=models.CASCADE,
        related_name="sla_violations",
    )
    
    # Time when violation occurred
    violation_hour = models.DateTimeField(
        db_index=True,
        help_text="Hour during which SLA was breached",
    )
    
    # SLA metrics
    expected_completeness_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=99.5,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="SLA threshold target (e.g., 99.5%)",
    )
    actual_completeness_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Actual completeness achieved",
    )
    
    # Impact
    events_missing = models.PositiveIntegerField(
        default=0,
        help_text="Number of events that were missing",
    )
    
    # Investigation
    status = models.CharField(
        max_length=16,
        choices=[
            ("open", "Open"),
            ("investigating", "Investigating"),
            ("resolved", "Resolved"),
        ],
        default="open",
        help_text="Investigation status of the violation",
    )
    
    root_cause = models.TextField(
        blank=True,
        help_text="Root cause analysis (populated during investigation)",
    )
    
    # Severity
    severity = models.CharField(
        max_length=16,
        choices=[
            ("low", "Low (< 1% miss)"),
            ("medium", "Medium (1-5% miss)"),
            ("high", "High (5-10% miss)"),
            ("critical", "Critical (> 10% miss)"),
        ],
        default="low",
    )
    
    # Alert sent
    alert_sent = models.BooleanField(
        default=False,
        help_text="Whether an alert was triggered for this violation",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the violation was marked as resolved",
    )

    class Meta:
        ordering = ["-violation_hour"]
        indexes = [
            models.Index(fields=["contract", "violation_hour"]),
            models.Index(fields=["status", "violation_hour"]),
        ]

    def __str__(self):
        return f"SLAViolation({self.contract.name} @ {self.violation_hour}, {self.actual_completeness_percent}%)"


class SLAConfiguration(models.Model):
    """
    Per-contract SLA configuration.
    Allows customization of thresholds and alert behavior per contract.
    """

    contract = models.OneToOneField(
        TrackedContract,
        on_delete=models.CASCADE,
        related_name="sla_config",
    )
    
    # Thresholds
    completeness_threshold_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=99.5,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Target completeness threshold (e.g., 99.5%)",
    )
    
    # Calculation window (how many hours to check)
    calculation_window_hours = models.PositiveIntegerField(
        default=24,
        help_text="Rolling window size for SLA calculation",
    )
    
    # Alerting
    alert_on_violation = models.BooleanField(
        default=True,
        help_text="Whether to send alerts when SLA is violated",
    )
    alert_channels = models.JSONField(
        default=list,
        blank=True,
        help_text='List of alert destinations: [{"type": "slack|email|webhook", "target": "..."}]',
    )
    
    # Enabled/disabled
    is_enabled = models.BooleanField(
        default=True,
        help_text="Whether SLA tracking is enabled for this contract",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "SLA Configuration"
        verbose_name_plural = "SLA Configurations"

    def __str__(self):
        return f"SLA({self.contract.name}: {self.completeness_threshold_percent}%)"
