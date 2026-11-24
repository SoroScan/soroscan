"""
Tests for POST /api/ingest/contracts/metadata/bulk-import/ endpoint.

Tests the HTTP-level permission checks, error handling, and response validation
for the metadata bulk import endpoint (staff only).
"""
import csv
import io
import json

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import ContractMetadata
from soroscan.ingest.tests.factories import (
    ContractMetadataFactory,
    TrackedContractFactory,
    UserFactory,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def staff_user():
    user = UserFactory()
    user.is_staff = True
    user.save()
    return user


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def authenticated_staff_client(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    return api_client


@pytest.fixture
def contract(user):
    return TrackedContractFactory(owner=user)


@pytest.mark.django_db
class TestBulkImportMetadataPermissions:
    """Test permission checks for the bulk import endpoint."""

    def test_non_staff_gets_403(self, authenticated_client):
        """Non-staff users should get 403 Forbidden."""
        url = reverse("bulk-import-metadata")
        data = {"content": json.dumps([])}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_gets_401(self, api_client):
        """Unauthenticated users should get 401 Unauthorized."""
        url = reverse("bulk-import-metadata")
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_staff_user_can_access(self, authenticated_staff_client):
        """Staff users should be allowed (endpoint exists and processes request)."""
        url = reverse("bulk-import-metadata")
        data = {"content": json.dumps([])}
        response = authenticated_staff_client.post(url, data, format="json")

        # Should not be 403 or 401. Could be 200/201 on success, or 400 on validation.
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ]


@pytest.mark.django_db
class TestBulkImportMetadataCSV:
    """Test CSV file import."""

    def test_import_valid_csv_creates_records(self, authenticated_staff_client, user):
        """Import a valid CSV file and verify records are created."""
        contract1 = TrackedContractFactory(owner=user)
        contract2 = TrackedContractFactory(owner=user)

        csv_data = io.StringIO()
        writer = csv.DictWriter(
            csv_data,
            fieldnames=[
                "contract_id",
                "name",
                "description",
                "documentation_url",
                "github_repo",
                "team_email",
                "tags",
            ],
        )
        writer.writeheader()
        writer.writerow({
            "contract_id": contract1.contract_id,
            "name": "Token Bridge",
            "description": "Cross-chain token bridge",
            "documentation_url": "https://docs.example.com",
            "github_repo": "https://github.com/example/bridge",
            "team_email": "team@example.com",
            "tags": "bridge,cctp",
        })
        writer.writerow({
            "contract_id": contract2.contract_id,
            "name": "Swap Router",
            "description": "DEX swap router",
            "documentation_url": "",
            "github_repo": "",
            "team_email": "",
            "tags": "dex,swap",
        })

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {
                "file": io.BytesIO(csv_data.getvalue().encode()),
                "format": "csv",
            },
            format="multipart",
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert "created" in response.data
        assert "updated" in response.data
        assert "errors" in response.data
        assert response.data["created"] == 2
        assert response.data["updated"] == 0

    def test_import_csv_with_content_string(self, authenticated_staff_client, user):
        """Import CSV via raw content string instead of file."""
        contract = TrackedContractFactory(owner=user)

        csv_content = f"""contract_id,name,description,documentation_url,github_repo,team_email,tags
{contract.contract_id},Metadata Name,Test Description,https://docs.example.com,https://github.com/example,team@example.com,tag1,tag2
"""

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": csv_content, "format": "csv"},
            format="json",
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data["created"] == 1

    def test_import_csv_with_mixed_valid_and_invalid_rows(
        self, authenticated_staff_client, user
    ):
        """CSV with some valid and some invalid rows reports correct counts."""
        valid_contract = TrackedContractFactory(owner=user)
        # Non-existent contract ID for invalid row
        invalid_contract_id = "CINVALIDCONTRACTID" + "0" * 36

        csv_content = f"""contract_id,name,description,documentation_url,github_repo,team_email,tags
{valid_contract.contract_id},Valid Metadata,Valid description,https://docs.example.com,https://github.com/example,team@example.com,tag1
{invalid_contract_id},Invalid Metadata,This contract does not exist,https://docs.example.com,https://github.com/example,team@example.com,tag1
"""

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": csv_content, "format": "csv"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1
        assert response.data["errors"] == 1
        assert len(response.data.get("error_details", [])) >= 1


@pytest.mark.django_db
class TestBulkImportMetadataJSON:
    """Test JSON file import."""

    def test_import_valid_json_creates_records(self, authenticated_staff_client, user):
        """Import a valid JSON file and verify records are created."""
        contract1 = TrackedContractFactory(owner=user)
        contract2 = TrackedContractFactory(owner=user)

        json_data = [
            {
                "contract_id": contract1.contract_id,
                "name": "Token Bridge",
                "description": "Cross-chain token bridge",
                "documentation_url": "https://docs.example.com",
                "github_repo": "https://github.com/example/bridge",
                "team_email": "team@example.com",
                "tags": ["bridge", "cctp"],
            },
            {
                "contract_id": contract2.contract_id,
                "name": "Swap Router",
                "description": "DEX swap router",
                "documentation_url": "",
                "github_repo": "",
                "team_email": "",
                "tags": ["dex", "swap"],
            },
        ]

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {
                "file": io.BytesIO(json.dumps(json_data).encode()),
                "format": "json",
            },
            format="multipart",
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data["created"] == 2
        assert response.data["updated"] == 0
        assert response.data["errors"] == 0

    def test_import_json_with_content_string(self, authenticated_staff_client, user):
        """Import JSON via raw content string instead of file."""
        contract = TrackedContractFactory(owner=user)

        json_content = json.dumps([
            {
                "contract_id": contract.contract_id,
                "name": "My Contract Metadata",
                "description": "A test contract",
                "documentation_url": "https://example.com",
                "github_repo": "",
                "team_email": "",
                "tags": ["test"],
            }
        ])

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json_content, "format": "json"},
            format="json",
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data["created"] == 1

    def test_import_json_with_mixed_valid_and_invalid_rows(
        self, authenticated_staff_client, user
    ):
        """JSON with some valid and some invalid rows reports correct counts."""
        valid_contract = TrackedContractFactory(owner=user)
        invalid_contract_id = "CINVALIDCONTRACTID" + "0" * 36

        json_content = json.dumps([
            {
                "contract_id": valid_contract.contract_id,
                "name": "Valid Metadata",
                "description": "Valid description",
                "documentation_url": "https://docs.example.com",
                "github_repo": "https://github.com/example",
                "team_email": "team@example.com",
                "tags": ["valid"],
            },
            {
                "contract_id": invalid_contract_id,
                "name": "Invalid Metadata",
                "description": "This contract does not exist",
                "documentation_url": "https://docs.example.com",
                "github_repo": "https://github.com/example",
                "team_email": "team@example.com",
                "tags": ["invalid"],
            },
        ])

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json_content, "format": "json"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 1
        assert response.data["errors"] == 1
        assert len(response.data.get("error_details", [])) >= 1


@pytest.mark.django_db
class TestBulkImportMetadataErrors:
    """Test error handling and edge cases."""

    def test_unknown_format_returns_400(self, authenticated_staff_client):
        """Unknown format parameter returns 400 Bad Request."""
        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": "some data", "format": "unknown_format"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data or "detail" in response.data

    def test_empty_input_returns_400(self, authenticated_staff_client):
        """Empty content returns 400 Bad Request."""
        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": "", "format": "csv"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_format_returns_400(self, authenticated_staff_client, user):
        """Missing format parameter returns 400 Bad Request."""
        contract = TrackedContractFactory(owner=user)
        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json.dumps([{"contract_id": contract.contract_id}])},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_malformed_json_returns_400(self, authenticated_staff_client):
        """Malformed JSON returns 400 Bad Request."""
        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": "not valid json {[", "format": "json"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_malformed_csv_with_missing_columns_returns_error(
        self, authenticated_staff_client
    ):
        """CSV with missing required columns returns error."""
        # CSV with no contract_id column
        csv_content = "name,description\nMyName,MyDesc\n"

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": csv_content, "format": "csv"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["errors"] > 0


@pytest.mark.django_db
class TestBulkImportMetadataUpdates:
    """Test update behavior when re-importing existing metadata."""

    def test_reimport_same_data_reports_updates_not_creations(
        self, authenticated_staff_client, user
    ):
        """Re-importing the same metadata reports updates, not new creations."""
        contract = TrackedContractFactory(owner=user)

        # First import: creates new metadata
        json_data = json.dumps([
            {
                "contract_id": contract.contract_id,
                "name": "Original Name",
                "description": "Original description",
                "documentation_url": "https://example.com",
                "github_repo": "",
                "team_email": "",
                "tags": ["original"],
            }
        ])

        url = reverse("bulk-import-metadata")
        response1 = authenticated_staff_client.post(
            url,
            {"content": json_data, "format": "json"},
            format="json",
        )

        assert response1.status_code == status.HTTP_200_OK
        assert response1.data["created"] == 1
        assert response1.data["updated"] == 0

        # Second import: same data should update (or skip if unchanged)
        response2 = authenticated_staff_client.post(
            url,
            {"content": json_data, "format": "json"},
            format="json",
        )

        assert response2.status_code == status.HTTP_200_OK
        # Should report as update or skip, not creation
        assert response2.data["created"] == 0

    def test_reimport_with_updated_fields(self, authenticated_staff_client, user):
        """Re-importing with changed fields reports as update."""
        contract = TrackedContractFactory(owner=user)

        # First import: creates metadata
        json_data_v1 = json.dumps([
            {
                "contract_id": contract.contract_id,
                "name": "Original Name",
                "description": "Original description",
                "documentation_url": "https://example.com",
                "github_repo": "",
                "team_email": "",
                "tags": ["original"],
            }
        ])

        url = reverse("bulk-import-metadata")
        response1 = authenticated_staff_client.post(
            url,
            {"content": json_data_v1, "format": "json"},
            format="json",
        )

        assert response1.data["created"] == 1

        # Second import: same contract but with changed name and description
        json_data_v2 = json.dumps([
            {
                "contract_id": contract.contract_id,
                "name": "Updated Name",
                "description": "Updated description",
                "documentation_url": "https://docs.new.com",
                "github_repo": "https://github.com/new",
                "team_email": "new@example.com",
                "tags": ["updated", "v2"],
            }
        ])

        response2 = authenticated_staff_client.post(
            url,
            {"content": json_data_v2, "format": "json"},
            format="json",
        )

        assert response2.status_code == status.HTTP_200_OK
        # Depending on implementation, could be "updated" if fields changed,
        # or report depends on how the endpoint tracks changes
        assert response2.data["created"] == 0

        # Verify the metadata was actually updated in the database
        metadata = ContractMetadata.objects.get(contract=contract)
        assert metadata.name == "Updated Name"
        assert metadata.description == "Updated description"


@pytest.mark.django_db
class TestBulkImportMetadataResponseFormat:
    """Test response structure and exact count assertions."""

    def test_response_has_required_fields(self, authenticated_staff_client, user):
        """Response includes created, updated, errors counts."""
        contract = TrackedContractFactory(owner=user)

        json_data = json.dumps([
            {
                "contract_id": contract.contract_id,
                "name": "Test",
                "description": "Test description",
                "documentation_url": "",
                "github_repo": "",
                "team_email": "",
                "tags": [],
            }
        ])

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json_data, "format": "json"},
            format="json",
        )

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert "created" in response.data
        assert "updated" in response.data
        assert "errors" in response.data
        assert isinstance(response.data["created"], int)
        assert isinstance(response.data["updated"], int)
        assert isinstance(response.data["errors"], int)

    def test_response_includes_error_details_on_failures(
        self, authenticated_staff_client, user
    ):
        """Response includes error_details when errors occur."""
        invalid_contract_id = "CINVALIDCONTRACTID" + "0" * 36

        json_data = json.dumps([
            {
                "contract_id": invalid_contract_id,
                "name": "Invalid",
                "description": "This contract does not exist",
                "documentation_url": "",
                "github_repo": "",
                "team_email": "",
                "tags": [],
            }
        ])

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json_data, "format": "json"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["errors"] == 1
        assert "error_details" in response.data
        assert isinstance(response.data["error_details"], list)
        assert len(response.data["error_details"]) > 0

    def test_exact_count_assertions_with_multiple_batches(
        self, authenticated_staff_client, user
    ):
        """Test exact count assertions with multiple contracts."""
        contracts = [TrackedContractFactory(owner=user) for _ in range(5)]

        rows = [
            {
                "contract_id": c.contract_id,
                "name": f"Contract {i}",
                "description": f"Description {i}",
                "documentation_url": "",
                "github_repo": "",
                "team_email": "",
                "tags": [],
            }
            for i, c in enumerate(contracts)
        ]

        json_data = json.dumps(rows)

        url = reverse("bulk-import-metadata")
        response = authenticated_staff_client.post(
            url,
            {"content": json_data, "format": "json"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] == 5
        assert response.data["updated"] == 0
        assert response.data["errors"] == 0
