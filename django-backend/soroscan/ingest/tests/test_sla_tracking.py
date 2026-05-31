from datetime import timedelta
from io import StringIO

from django.test import TestCase, override_settings
from django.utils import timezone
from soroscan.ingest.models import ContractCompletenessSLA, ContractEvent, SLAAlert, TrackedContract
from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory


class ContractCompletenessSLAModelTest(TestCase):
    def setUp(self):
        self.contract = TrackedContractFactory(name="TestContract")

    def test_create_sla_record(self):
        """Test creating a ContractCompletenessSLA record."""
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0)
        sla = ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=hour_start,
            events_expected=100,
            events_indexed=95,
            sla_percentage=95.0,
            is_violated=False,
        )
        self.assertEqual(sla.contract, self.contract)
        self.assertEqual(sla.events_expected, 100)
        self.assertEqual(sla.events_indexed, 95)
        self.assertEqual(sla.sla_percentage, 95.0)
        self.assertFalse(sla.is_violated)

    def test_sla_violation_detection(self):
        """Test that SLA is violated when below 95% threshold."""
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0)
        sla = ContractCompletenessSLA(
            contract=self.contract,
            hour_start=hour_start,
            events_expected=100,
            events_indexed=90,
            sla_percentage=90.0,
        )
        sla.save()
        self.assertTrue(sla.is_violated)

    def test_sla_recovers_above_threshold(self):
        """Test SLA recovery when percentage goes back above threshold."""
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0)
        
        # Create violation record
        sla_violation = ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=hour_start,
            events_expected=100,
            events_indexed=90,
            sla_percentage=90.0,
            is_violated=True,
        )

        # Create recovery record (next hour)
        next_hour = hour_start + timedelta(hours=1)
        sla_recovery = ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=next_hour,
            events_expected=100,
            events_indexed=98,
            sla_percentage=98.0,
            is_violated=False,
        )

        self.assertTrue(sla_violation.is_violated)
        self.assertFalse(sla_recovery.is_violated)

    def test_unique_together_constraint(self):
        """Test that contract and hour_start must be unique together."""
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0)
        
        ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=hour_start,
            events_expected=100,
            events_indexed=100,
            sla_percentage=100.0,
        )

        # Attempting to create duplicate should raise IntegrityError
        from django.db.utils import IntegrityError
        with self.assertRaises(IntegrityError):
            ContractCompletenessSLA.objects.create(
                contract=self.contract,
                hour_start=hour_start,
                events_expected=50,
                events_indexed=50,
                sla_percentage=50.0,
            )


class SLAAlertModelTest(TestCase):
    def setUp(self):
        self.contract = TrackedContractFactory()
        self.sla_record = ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=timezone.now().replace(minute=0, second=0, microsecond=0),
            events_expected=100,
            events_indexed=90,
            sla_percentage=90.0,
            is_violated=True,
        )

    def test_create_sla_alert(self):
        """Test creating an SLAAlert record."""
        alert = SLAAlert.objects.create(
            sla_record=self.sla_record,
            alert_type=SLAAlert.ALERT_TYPE_SLA_VIOLATION,
            contract=self.contract,
            message="SLA violation detected",
        )
        self.assertEqual(alert.alert_type, SLAAlert.ALERT_TYPE_SLA_VIOLATION)
        self.assertEqual(alert.contract, self.contract)
        self.assertFalse(alert.acknowledged)

    def test_acknowledge_sla_alert(self):
        """Test acknowledging an SLAAlert."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(username="admin", password="password")

        alert = SLAAlert.objects.create(
            sla_record=self.sla_record,
            alert_type=SLAAlert.ALERT_TYPE_SLA_VIOLATION,
            contract=self.contract,
            message="SLA violation detected",
        )
        alert.acknowledged = True
        alert.acknowledged_by = user
        alert.acknowledged_at = timezone.now()
        alert.save()

        self.assertTrue(alert.acknowledged)
        self.assertEqual(alert.acknowledged_by, user)


class CalculateSLACommandTest(TestCase):
    def setUp(self):
        self.contract = TrackedContractFactory(name="SLAContract")

    def test_sla_calculation_with_events(self):
        """Test SLA calculation with contract having events."""
        from django.core.management import call_command

        # Create events in the previous hour
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        for i in range(95):
            ContractEventFactory(
                contract=self.contract,
                timestamp=hour_start + timedelta(minutes=i),
            )

        out = StringIO()
        call_command("calculate_sla", stdout=out)

        sla = ContractCompletenessSLA.objects.filter(contract=self.contract).latest("hour_start")
        self.assertEqual(sla.events_indexed, 95)
        self.assertFalse(sla.is_violated)

    def test_sla_violation_creates_alert(self):
        """Test that SLA violation creates an alert record."""
        from django.core.management import call_command

        # Create events in the previous hour (below 95% threshold)
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        for i in range(90):
            ContractEventFactory(
                contract=self.contract,
                timestamp=hour_start + timedelta(minutes=i),
            )

        out = StringIO()
        call_command("calculate_sla", stdout=out)

        sla = ContractCompletenessSLA.objects.filter(contract=self.contract).latest("hour_start")
        self.assertTrue(sla.is_violated)

        alerts = SLAAlert.objects.filter(contract=self.contract, alert_type=SLAAlert.ALERT_TYPE_SLA_VIOLATION)
        self.assertEqual(alerts.count(), 1)
        self.assertEqual(alerts.first().sla_record, sla)

    def test_sla_recovery_creates_recovery_alert(self):
        """Test that SLA recovery creates a recovery alert."""
        from django.core.management import call_command

        # First hour - violation
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=2)
        for i in range(90):
            ContractEventFactory(
                contract=self.contract,
                timestamp=hour_start + timedelta(minutes=i),
            )

        # Second hour - recovery
        next_hour = hour_start + timedelta(hours=1)
        for i in range(98):
            ContractEventFactory(
                contract=self.contract,
                timestamp=next_hour + timedelta(minutes=i),
            )

        out = StringIO()
        call_command("calculate_sla", "--hours=2", stdout=out)

        # Check both SLA records
        violations = ContractCompletenessSLA.objects.filter(contract=self.contract, is_violated=True)
        recoveries = ContractCompletenessSLA.objects.filter(contract=self.contract, is_violated=False)

        self.assertTrue(violations.exists())
        self.assertTrue(recoveries.exists())

        recovery_alerts = SLAAlert.objects.filter(contract=self.contract, alert_type=SLAAlert.ALERT_TYPE_RECOVERY)
        self.assertTrue(recovery_alerts.exists())

    def test_specific_contract_option(self):
        """Test calculating SLA for a specific contract only."""
        from django.core.management import call_command

        # Create events for both contracts
        contract2 = TrackedContractFactory(name="Contract2")
        hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        
        for i in range(95):
            ContractEventFactory(
                contract=self.contract,
                timestamp=hour_start + timedelta(minutes=i),
            )
        for i in range(95):
            ContractEventFactory(
                contract=contract2,
                timestamp=hour_start + timedelta(minutes=i),
            )

        out = StringIO()
        call_command("calculate_sla", "--contract-id", self.contract.contract_id, stdout=out)

        sla_count = ContractCompletenessSLA.objects.filter(contract=self.contract).count()
        sla_count_2 = ContractCompletenessSLA.objects.filter(contract=contract2).count()

        self.assertEqual(sla_count, 1)
        self.assertEqual(sla_count_2, 0)


class SLAMetricsAPITest(TestCase):
    def setUp(self):
        self.contract = TrackedContractFactory(name="SLAContract")
        self.hour_start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)

    def test_sla_metrics_endpoint(self):
        """Test the SLA metrics API endpoint."""
        from django.test import Client

        # Create SLA records
        ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=self.hour_start,
            events_expected=100,
            events_indexed=98,
            sla_percentage=98.0,
            is_violated=False,
        )
        ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=self.hour_start - timedelta(hours=1),
            events_expected=100,
            events_indexed=92,
            sla_percentage=92.0,
            is_violated=True,
        )

        client = Client()
        response = client.get("/api/ingest/admin/sla-metrics/")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["contract"], self.contract.id)
        self.assertEqual(data[0]["latest_sla"], 98.0)
        self.assertEqual(data[0]["violations"], 1)

    @override_settings(DEBUG=True)
    def test_sla_metrics_aggregates_avg(self):
        """Test that SLA metrics aggregates average correctly."""
        from django.test import Client

        ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=self.hour_start,
            events_expected=100,
            events_indexed=96,
            sla_percentage=96.0,
            is_violated=False,
        )
        ContractCompletenessSLA.objects.create(
            contract=self.contract,
            hour_start=self.hour_start - timedelta(hours=1),
            events_expected=100,
            events_indexed=94,
            sla_percentage=94.0,
            is_violated=False,
        )

        client = Client()
        response = client.get("/api/ingest/admin/sla-metrics/")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertAlmostEqual(data[0]["avg_sla"], 95.0, places=1)