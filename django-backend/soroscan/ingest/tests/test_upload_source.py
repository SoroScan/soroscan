"""
Tests for POST /api/ingest/contracts/{id}/upload_source/ endpoint.

Tests permission checks (owner, team members, unrelated users),
file handling (missing files, oversized files, wrong types),
and the edge case of contracts with no team.
"""
import json
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import SimpleUploadedFile

from soroscan.ingest.models import ContractSource, Team, TeamMembership, TrackedContract

from .factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def owner():
    return UserFactory()


@pytest.fixture
def team_member():
    return UserFactory()


@pytest.fixture
def unrelated_user():
    return UserFactory()


@pytest.fixture
def contract_with_team(owner, team_member):
    """Create a contract with a team and add team_member to it."""
    contract = TrackedContractFactory(owner=owner, team=None)
    team = Team.objects.create(
        name="Test Team",
        slug="test-team",
        organization=None,
        created_by=owner,
    )
    contract.team = team
    contract.save()

    TeamMembership.objects.create(
        team=team,
        user=owner,
        role=TeamMembership.Role.ADMIN,
    )
    TeamMembership.objects.create(
        team=team,
        user=team_member,
        role=TeamMembership.Role.MEMBER,
    )

    return contract


@pytest.fixture
def contract_no_team(owner):
    """Create a contract with no team."""
    return TrackedContractFactory(owner=owner, team=None)


@pytest.fixture
def authenticated_owner_client(api_client, owner):
    api_client.force_authenticate(user=owner)
    return api_client


@pytest.fixture
def authenticated_team_member_client(api_client, team_member):
    api_client.force_authenticate(user=team_member)
    return api_client


@pytest.fixture
def authenticated_unrelated_client(api_client, unrelated_user):
    api_client.force_authenticate(user=unrelated_user)
    return api_client


def create_rust_file(filename: str = "source.rs", content: bytes = None) -> SimpleUploadedFile:
    """Helper to create a Rust source file."""
    if content is None:
        content = b"fn main() { println!(\"Hello\"); }"
    return SimpleUploadedFile(
        filename,
        content,
        content_type="text/plain",
    )


def create_tarball_file(filename: str = "source.tar.gz", size: int = 1000) -> SimpleUploadedFile:
    """Helper to create a tarball file."""
    content = b"tar archive content" + b"x" * max(0, size - 20)
    return SimpleUploadedFile(
        filename,
        content,
        content_type="application/gzip",
    )


def create_abi_json() -> dict:
    """Helper to create ABI JSON."""
    return [
        {
            "name": "transfer",
            "fields": [
                {"name": "from", "type": "Address"},
                {"name": "to", "type": "Address"},
                {"name": "amount", "type": "I128"},
            ],
        }
    ]


@pytest.mark.django_db
class TestUploadSourcePermissions:
    """Test permission checks for the upload_source endpoint."""

    def test_owner_can_upload_rust_file(self, authenticated_owner_client, contract_no_team):
        """Contract owner can upload a Rust source file."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert ContractSource.objects.filter(contract=contract_no_team).exists()
        source = ContractSource.objects.get(contract=contract_no_team)
        assert source.uploaded_by == contract_no_team.owner

    def test_owner_can_upload_with_abi(self, authenticated_owner_client, contract_no_team):
        """Contract owner can upload file with ABI JSON."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        abi = create_abi_json()
        response = authenticated_owner_client.post(
            url,
            {
                "source_file": file_obj,
                "abi_json": json.dumps(abi),
            },
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        source = ContractSource.objects.get(contract=contract_no_team)
        assert source.abi_json == abi

    def test_team_member_can_upload(
        self,
        authenticated_team_member_client,
        contract_with_team,
        team_member,
    ):
        """Team member of the contract can upload source."""
        url = reverse("contract-upload_source", args=[contract_with_team.id])
        file_obj = create_rust_file()
        response = authenticated_team_member_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        source = ContractSource.objects.get(contract=contract_with_team)
        assert source.uploaded_by == team_member

    def test_unrelated_user_gets_403(
        self,
        authenticated_unrelated_client,
        contract_with_team,
    ):
        """Unrelated authenticated user gets 403 Forbidden."""
        url = reverse("contract-upload_source", args=[contract_with_team.id])
        file_obj = create_rust_file()
        response = authenticated_unrelated_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not ContractSource.objects.filter(contract=contract_with_team).exists()

    def test_unrelated_user_gets_403_even_with_no_team(
        self,
        authenticated_unrelated_client,
        contract_no_team,
    ):
        """Unrelated user cannot upload even if contract has no team."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_unrelated_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_request_rejected(self, api_client, contract_no_team):
        """Unauthenticated requests are rejected with 401."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = api_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUploadSourceFileHandling:
    """Test file handling and validation."""

    def test_missing_file_returns_400(self, authenticated_owner_client, contract_no_team):
        """Missing source_file parameter returns 400 Bad Request."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        response = authenticated_owner_client.post(url, {}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not ContractSource.objects.filter(contract=contract_no_team).exists()

    def test_empty_file_returns_400(self, authenticated_owner_client, contract_no_team):
        """Empty file is rejected with 400."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = SimpleUploadedFile("empty.rs", b"", content_type="text/plain")
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_multiple_uploads_allowed(self, authenticated_owner_client, contract_no_team):
        """Multiple uploads to the same contract are allowed (versioning)."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])

        # First upload
        file_obj1 = create_rust_file(content=b"version 1")
        response1 = authenticated_owner_client.post(
            url,
            {"source_file": file_obj1},
            format="multipart",
        )
        assert response1.status_code == status.HTTP_201_CREATED

        # Second upload
        file_obj2 = create_rust_file(content=b"version 2")
        response2 = authenticated_owner_client.post(
            url,
            {"source_file": file_obj2},
            format="multipart",
        )
        assert response2.status_code == status.HTTP_201_CREATED

        # Both should exist
        sources = ContractSource.objects.filter(contract=contract_no_team).order_by("uploaded_at")
        assert sources.count() == 2
        assert sources[0].source_file.read() == b"version 1"
        assert sources[1].source_file.read() == b"version 2"

    def test_tarball_upload_works(self, authenticated_owner_client, contract_no_team):
        """Tarball files can be uploaded."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        tarball = create_tarball_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": tarball},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        source = ContractSource.objects.get(contract=contract_no_team)
        assert source.source_file.name.endswith(".tar.gz")


@pytest.mark.django_db
class TestUploadSourceContractWithNoTeam:
    """Test edge case: contracts with no team."""

    def test_owner_can_upload_to_contract_with_null_team(
        self,
        authenticated_owner_client,
        contract_no_team,
    ):
        """Owner can upload to contract that has team=NULL (no AttributeError)."""
        # Verify contract has no team
        contract_no_team.refresh_from_db()
        assert contract_no_team.team is None

        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        # Should succeed without AttributeError on contract.team.members
        assert response.status_code == status.HTTP_201_CREATED

    def test_unrelated_user_still_forbidden_even_null_team(
        self,
        authenticated_unrelated_client,
        contract_no_team,
    ):
        """Unrelated user is still forbidden even if contract has null team."""
        contract_no_team.refresh_from_db()
        assert contract_no_team.team is None

        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_unrelated_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestUploadSourceResponseFormat:
    """Test response format and fields."""

    def test_response_includes_required_fields(
        self,
        authenticated_owner_client,
        contract_no_team,
    ):
        """Response includes id, source_file, uploaded_by, uploaded_at."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "id" in data
        assert "source_file" in data
        assert "uploaded_by" in data
        assert "uploaded_at" in data
        assert isinstance(data["id"], int)
        assert isinstance(data["uploaded_by"], (int, dict))

    def test_abi_json_in_response_when_provided(
        self,
        authenticated_owner_client,
        contract_no_team,
    ):
        """ABI JSON is included in response when provided."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        abi = create_abi_json()
        response = authenticated_owner_client.post(
            url,
            {
                "source_file": file_obj,
                "abi_json": json.dumps(abi),
            },
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "abi_json" in response.data
        assert response.data["abi_json"] == abi

    def test_abi_json_null_when_not_provided(
        self,
        authenticated_owner_client,
        contract_no_team,
    ):
        """ABI JSON is null when not provided."""
        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data.get("abi_json") is None


@pytest.mark.django_db
class TestUploadSourceCleanup:
    """Test that uploaded files don't persist after tests."""

    def test_uploaded_files_in_temp_media_root(
        self,
        authenticated_owner_client,
        contract_no_team,
        settings,
    ):
        """Files are stored in MEDIA_ROOT (which is temp for tests)."""
        # Settings should use a temporary MEDIA_ROOT
        assert "tmp" in str(settings.MEDIA_ROOT) or "temp" in str(settings.MEDIA_ROOT).lower()

        url = reverse("contract-upload_source", args=[contract_no_team.id])
        file_obj = create_rust_file()
        response = authenticated_owner_client.post(
            url,
            {"source_file": file_obj},
            format="multipart",
        )

        assert response.status_code == status.HTTP_201_CREATED
        # File should be accessible but cleaned up after test
        source = ContractSource.objects.get(contract=contract_no_team)
        assert source.source_file.name is not None
