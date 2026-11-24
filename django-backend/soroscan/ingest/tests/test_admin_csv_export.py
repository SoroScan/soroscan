"""
Tests for ContractEventAdmin CSV export action (issue #<placeholder>).
"""
import csv
import pytest
from io import StringIO
from datetime import datetime

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory

from soroscan.ingest.admin import ContractEventAdmin
from soroscan.ingest.models import ContractEvent
from soroscan.ingest.tests.factories import ContractEventFactory, TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestContractEventAdminCSVExport:
    def setup_method(self):
        self.site = AdminSite()
        self.admin = ContractEventAdmin(ContractEvent, self.site)
        self.factory = RequestFactory()
        self.superuser = UserFactory(is_staff=True, is_superuser=True)

    def test_export_events_csv_headers(self):
        """Verify the response has correct CSV headers and filename."""
        request = self.factory.post("/")
        request.user = self.superuser
        queryset = ContractEvent.objects.none()
        
        response = self.admin.export_events_csv(request, queryset)
        
        assert response.status_code == 200
        assert response["Content-Type"] == "text/csv"
        
        expected_filename = f"contract_events_{datetime.now().strftime('%Y%m%d')}.csv"
        assert f'attachment; filename="{expected_filename}"' in response["Content-Disposition"]

    def test_export_events_csv_content(self):
        """Verify the exported CSV content matches the selected queryset."""
        contract = TrackedContractFactory(contract_id="CABC123")
        event1 = ContractEventFactory(contract=contract, event_type="transfer")
        event2 = ContractEventFactory(contract=contract, event_type="swap")
        # Unselected event
        ContractEventFactory(contract=contract, event_type="deposit")

        request = self.factory.post("/")
        request.user = self.superuser
        queryset = ContractEvent.objects.filter(id__in=[event1.id, event2.id])
        
        response = self.admin.export_events_csv(request, queryset)
        
        # Consume the streaming response
        content = b"".join(response.streaming_content).decode("utf-8")
        reader = csv.reader(StringIO(content))
        rows = list(reader)

        # Assert header row
        assert rows[0] == ["ID", "Contract Address", "Event Type", "Timestamp"]
        
        # Assert data rows
        assert len(rows) == 3 # Header + 2 data rows
        
        # Refresh from DB to ensure timestamps are timezone-aware as returned by the query
        event1.refresh_from_db()
        event2.refresh_from_db()

        # Create a dictionary of rows by event ID for robust asserting
        data_dict = {int(row[0]): row for row in rows[1:]}
        
        assert data_dict[event1.id] == [
            str(event1.id),
            "CABC123",
            "transfer",
            event1.timestamp.isoformat(),
        ]
        
        assert data_dict[event2.id] == [
            str(event2.id),
            "CABC123",
            "swap",
            event2.timestamp.isoformat(),
        ]

    def test_export_events_csv_escaping(self):
        """Verify special characters in fields are properly escaped in CSV."""
        contract = TrackedContractFactory(contract_id="CXYZ789")
        # Event type with comma and quote
        event = ContractEventFactory(contract=contract, event_type='my, "special" event')

        request = self.factory.post("/")
        request.user = self.superuser
        queryset = ContractEvent.objects.filter(id=event.id)
        
        response = self.admin.export_events_csv(request, queryset)
        
        content = b"".join(response.streaming_content).decode("utf-8")
        reader = csv.reader(StringIO(content))
        rows = list(reader)
        
        assert len(rows) == 2
        # Escaping is handled correctly if csv.reader can parse it back into the original parts
        assert rows[1][2] == 'my, "special" event'
