"""
Tests for field-level authorization in GraphQL resolvers (Issue #1306).

Covers the `field_permission_classes` decorator in
`soroscan.graphql_extensions`, applied to individual (non-top-level) fields
on `ContractType` and `ContractMetadataType`:

- `ContractType.teamId` / `ContractType.organizationId` -- gated with
  `IsStaff` (internal billing/org identifiers).
- `ContractMetadataType.teamEmail` -- gated with `IsAuthenticated` (PII).

For each protected field:
- An authorized user (matching the required permission) can read its value.
- An unauthorized user (authenticated but lacking the permission) gets
  `null` for that field, while the rest of the type's fields still resolve.
- An unauthenticated (anonymous) request also gets `null` for that field.
"""
from unittest.mock import Mock

import pytest

from soroscan.ingest.models import Team
from soroscan.ingest.schema import schema

from .factories import ContractMetadataFactory, TrackedContractFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ctx(user=None):
    """Build a minimal GraphQL context, optionally with an authenticated user."""
    context = Mock()
    request = Mock()
    if user is not None:
        request.user = user
    else:
        anon = Mock()
        anon.is_authenticated = False
        request.user = anon
    context.request = request
    return context


# ---------------------------------------------------------------------------
# ContractType.teamId / organizationId (IsStaff)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContractStaffOnlyFields:
    QUERY = """
        query GetContract($contractId: String!) {
            contract(contractId: $contractId) {
                name
                teamId
                organizationId
            }
        }
    """

    def _make_contract_with_team(self):
        team = Team.objects.create(name="Engineering")
        return TrackedContractFactory(team=team), team

    def test_staff_user_can_read_team_id(self):
        contract, team = self._make_contract_with_team()
        staff_user = UserFactory(is_staff=True)
        # The `contract` query resolver only returns contracts owned by the
        # caller or shared via team/org membership for authenticated users,
        # so make the staff user the owner to keep this test focused purely
        # on field-level (not row-level) authorization.
        contract.owner = staff_user
        contract.save()

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": contract.contract_id},
            context_value=_ctx(staff_user),
        )

        assert result.errors is None
        assert result.data["contract"]["name"] == contract.name
        assert result.data["contract"]["teamId"] == team.id
        assert result.data["contract"]["organizationId"] is None

    def test_non_staff_authenticated_user_gets_null_team_id(self):
        contract, _team = self._make_contract_with_team()
        regular_user = UserFactory(is_staff=False)
        contract.owner = regular_user
        contract.save()

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": contract.contract_id},
            context_value=_ctx(regular_user),
        )

        assert result.errors is None
        # Non-protected fields still resolve normally.
        assert result.data["contract"]["name"] == contract.name
        # Protected fields are redacted (null), not an error.
        assert result.data["contract"]["teamId"] is None
        assert result.data["contract"]["organizationId"] is None

    def test_anonymous_user_gets_null_team_id(self):
        contract, _team = self._make_contract_with_team()

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": contract.contract_id},
            context_value=_ctx(None),
        )

        assert result.errors is None
        assert result.data["contract"]["name"] == contract.name
        assert result.data["contract"]["teamId"] is None
        assert result.data["contract"]["organizationId"] is None

    def test_anonymous_user_with_no_context_user_attr(self):
        """Anonymous requests with a bare dict-style context are also denied."""
        contract, _team = self._make_contract_with_team()

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": contract.contract_id},
            context_value={},
        )

        assert result.errors is None
        assert result.data["contract"]["teamId"] is None
        assert result.data["contract"]["organizationId"] is None


# ---------------------------------------------------------------------------
# ContractMetadataType.teamEmail (IsAuthenticated)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContractMetadataTeamEmailField:
    QUERY = """
        query GetMetadata($contractId: String!) {
            contractMetadata(contractId: $contractId) {
                name
                description
                teamEmail
            }
        }
    """

    def test_authenticated_user_can_read_team_email(self):
        metadata = ContractMetadataFactory(team_email="ops@example.com")
        user = UserFactory()

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": metadata.contract.contract_id},
            context_value=_ctx(user),
        )

        assert result.errors is None
        assert result.data["contractMetadata"]["name"] == metadata.name
        assert result.data["contractMetadata"]["teamEmail"] == "ops@example.com"

    def test_unauthenticated_user_gets_null_team_email(self):
        metadata = ContractMetadataFactory(team_email="ops@example.com")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": metadata.contract.contract_id},
            context_value=_ctx(None),
        )

        assert result.errors is None
        # Sibling fields still resolve for the anonymous caller.
        assert result.data["contractMetadata"]["name"] == metadata.name
        assert result.data["contractMetadata"]["description"] == metadata.description
        # The protected field is redacted rather than erroring out.
        assert result.data["contractMetadata"]["teamEmail"] is None

    def test_no_context_at_all_gets_null_team_email(self):
        """No request context (e.g. context_value=None) must fail safe (deny), not crash."""
        metadata = ContractMetadataFactory(team_email="ops@example.com")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"contractId": metadata.contract.contract_id},
        )

        assert result.errors is None
        assert result.data["contractMetadata"]["teamEmail"] is None


# ---------------------------------------------------------------------------
# Unit tests for the field_permission_classes decorator itself
# ---------------------------------------------------------------------------


class TestFieldPermissionClassesDecorator:
    def _make_info(self, user=None):
        info = Mock()
        request = Mock()
        if user is not None:
            request.user = user
        else:
            anon = Mock()
            anon.is_authenticated = False
            request.user = anon
        info.context.request = request
        return info

    def test_allows_call_through_when_authorized(self):
        from soroscan.graphql_extensions import IsAuthenticated, field_permission_classes

        @field_permission_classes([IsAuthenticated])
        def resolver(self, info):
            return "secret-value"

        user = Mock()
        user.is_authenticated = True
        info = self._make_info(user)

        assert resolver(None, info) == "secret-value"

    def test_redacts_to_none_when_unauthorized_by_default(self):
        from soroscan.graphql_extensions import IsAuthenticated, field_permission_classes

        @field_permission_classes([IsAuthenticated])
        def resolver(self, info):
            return "secret-value"

        info = self._make_info(None)

        assert resolver(None, info) is None

    def test_raises_when_redact_is_false(self):
        from soroscan.graphql_extensions import (
            PermissionDeniedError,
            IsAuthenticated,
            field_permission_classes,
        )

        @field_permission_classes([IsAuthenticated], redact=False)
        def resolver(self, info):
            return "secret-value"

        info = self._make_info(None)

        with pytest.raises(PermissionDeniedError):
            resolver(None, info)

    def test_is_staff_denies_non_staff_authenticated_user(self):
        from soroscan.graphql_extensions import IsStaff, field_permission_classes

        @field_permission_classes([IsStaff])
        def resolver(self, info):
            return "staff-only"

        user = Mock()
        user.is_authenticated = True
        user.is_staff = False
        info = self._make_info(user)

        assert resolver(None, info) is None

    def test_is_staff_allows_staff_user(self):
        from soroscan.graphql_extensions import IsStaff, field_permission_classes

        @field_permission_classes([IsStaff])
        def resolver(self, info):
            return "staff-only"

        user = Mock()
        user.is_authenticated = True
        user.is_staff = True
        info = self._make_info(user)

        assert resolver(None, info) == "staff-only"
