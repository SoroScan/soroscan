import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from soroscan.ingest.models import Team, TeamMembership
from soroscan.ingest.tests.factories import UserFactory


@pytest.mark.django_db
class TestTeamMembersAPI:
    def setup_method(self):
        self.admin = UserFactory()
        self.team = Team.objects.create(name="API Team")
        TeamMembership.objects.create(
            team=self.team,
            user=self.admin,
            role=TeamMembership.Role.ADMIN,
        )
        self.url = reverse("team-members", args=[self.team.id])

    def test_admin_can_add_existing_user_with_requested_role(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        new_user = UserFactory()

        response = client.post(
            self.url,
            {"user_id": new_user.id, "role": TeamMembership.Role.ADMIN},
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data == {"status": "created"}
        membership = TeamMembership.objects.get(team=self.team, user=new_user)
        assert membership.role == TeamMembership.Role.ADMIN

    def test_non_admin_member_cannot_add_member(self):
        member = UserFactory()
        TeamMembership.objects.create(
            team=self.team,
            user=member,
            role=TeamMembership.Role.MEMBER,
        )
        client = APIClient()
        client.force_authenticate(user=member)
        new_user = UserFactory()

        response = client.post(self.url, {"user_id": new_user.id}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not TeamMembership.objects.filter(team=self.team, user=new_user).exists()

    def test_non_member_gets_not_found(self):
        client = APIClient()
        client.force_authenticate(user=UserFactory())
        new_user = UserFactory()

        response = client.post(self.url, {"user_id": new_user.id}, format="json")

        # TeamViewSet scopes its queryset to teams the requester belongs to.
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not TeamMembership.objects.filter(team=self.team, user=new_user).exists()

    def test_unknown_user_returns_bad_request(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        response = client.post(
            self.url,
            {"user_id": 999999},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data == {"detail": "User not found."}

    def test_invalid_role_returns_bad_request(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        new_user = UserFactory()

        response = client.post(
            self.url,
            {"user_id": new_user.id, "role": "superuser"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in response.data
        assert not TeamMembership.objects.filter(team=self.team, user=new_user).exists()

    def test_duplicate_add_is_idempotent_and_does_not_change_role(self):
        member = UserFactory()
        TeamMembership.objects.create(
            team=self.team,
            user=member,
            role=TeamMembership.Role.MEMBER,
        )
        client = APIClient()
        client.force_authenticate(user=self.admin)

        response = client.post(
            self.url,
            {"user_id": member.id, "role": TeamMembership.Role.ADMIN},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"status": "already_member"}
        assert TeamMembership.objects.filter(team=self.team, user=member).count() == 1
        membership = TeamMembership.objects.get(team=self.team, user=member)
        assert membership.role == TeamMembership.Role.MEMBER

    def test_unauthenticated_request_is_rejected(self):
        response = APIClient().post(self.url, {"user_id": UserFactory().id}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
