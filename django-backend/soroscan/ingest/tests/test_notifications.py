"""
Tests for the notification center (Issue #137):
  - GraphQL queries: notifications, unreadNotificationCount
  - GraphQL mutations: markNotificationRead, markAllNotificationsRead, clearAllNotifications
  - updateContract paused notification side-effect
  - services/notifications.create_and_push
"""
import pytest
from unittest.mock import Mock, patch

from soroscan.ingest.models import Notification
from soroscan.ingest.schema import schema
from .factories import TrackedContractFactory, UserFactory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ctx(user):
    """Build a minimal GraphQL context with an authenticated user."""
    context = Mock()
    request = Mock()
    request.user = user
    context.request = request
    return context


def _make_notification(user, **kwargs):
    defaults = dict(
        notification_type=Notification.NotificationType.SYSTEM,
        title="Test",
        message="Test message",
        link="",
        is_read=False,
    )
    defaults.update(kwargs)
    return Notification.objects.create(user=user, **defaults)


# ---------------------------------------------------------------------------
# Query: notifications
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNotificationsQuery:
    QUERY = """
        query GetNotifications($notificationType: String, $unreadOnly: Boolean, $limit: Int) {
            notifications(notificationType: $notificationType, unreadOnly: $unreadOnly, limit: $limit) {
                id
                notificationType
                title
                message
                link
                isRead
                createdAt
            }
        }
    """

    def test_returns_notifications_for_user(self):
        user = UserFactory()
        _make_notification(user, title="N1")
        _make_notification(user, title="N2")

        result = schema.execute_sync(self.QUERY, context_value=_ctx(user))
        assert result.errors is None
        assert len(result.data["notifications"]) == 2

    def test_does_not_return_other_users_notifications(self):
        user = UserFactory()
        other = UserFactory()
        _make_notification(user, title="Mine")
        _make_notification(other, title="Theirs")

        result = schema.execute_sync(self.QUERY, context_value=_ctx(user))
        assert result.errors is None
        assert len(result.data["notifications"]) == 1
        assert result.data["notifications"][0]["title"] == "Mine"

    def test_filter_by_type(self):
        user = UserFactory()
        _make_notification(user, notification_type="webhook_failure", title="WH")
        _make_notification(user, notification_type="system", title="SYS")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"notificationType": "webhook_failure"},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert len(result.data["notifications"]) == 1
        assert result.data["notifications"][0]["notificationType"] == "webhook_failure"

    def test_filter_unread_only(self):
        user = UserFactory()
        _make_notification(user, is_read=False, title="Unread")
        _make_notification(user, is_read=True, title="Read")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"unreadOnly": True},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert len(result.data["notifications"]) == 1
        assert result.data["notifications"][0]["title"] == "Unread"

    def test_limit_enforced(self):
        user = UserFactory()
        for i in range(10):
            _make_notification(user, title=f"N{i}")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"limit": 3},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert len(result.data["notifications"]) == 3

    def test_limit_capped_at_50(self):
        user = UserFactory()
        for i in range(55):
            _make_notification(user, title=f"N{i}")

        result = schema.execute_sync(
            self.QUERY,
            variable_values={"limit": 100},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert len(result.data["notifications"]) == 50

    def test_unauthenticated_raises(self):
        context = Mock()
        context.request = None

        result = schema.execute_sync(self.QUERY, context_value=context)
        assert result.errors is not None


# ---------------------------------------------------------------------------
# Query: unreadNotificationCount
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestUnreadNotificationCount:
    QUERY = "query { unreadNotificationCount }"

    def test_returns_correct_count(self):
        user = UserFactory()
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=True)

        result = schema.execute_sync(self.QUERY, context_value=_ctx(user))
        assert result.errors is None
        assert result.data["unreadNotificationCount"] == 2

    def test_returns_zero_when_unauthenticated(self):
        context = Mock()
        context.request = None

        result = schema.execute_sync(self.QUERY, context_value=context)
        assert result.errors is None
        assert result.data["unreadNotificationCount"] == 0


# ---------------------------------------------------------------------------
# Mutation: markNotificationRead
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMarkNotificationRead:
    MUTATION = """
        mutation MarkRead($id: Int!) {
            markNotificationRead(notificationId: $id)
        }
    """

    def test_marks_notification_as_read(self):
        user = UserFactory()
        n = _make_notification(user, is_read=False)

        result = schema.execute_sync(
            self.MUTATION,
            variable_values={"id": n.id},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert result.data["markNotificationRead"] is True
        n.refresh_from_db()
        assert n.is_read is True

    def test_returns_false_for_other_users_notification(self):
        user = UserFactory()
        other = UserFactory()
        n = _make_notification(other, is_read=False)

        result = schema.execute_sync(
            self.MUTATION,
            variable_values={"id": n.id},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert result.data["markNotificationRead"] is False

    def test_unauthenticated_raises(self):
        context = Mock()
        context.request = None

        result = schema.execute_sync(
            self.MUTATION,
            variable_values={"id": 999},
            context_value=context,
        )
        assert result.errors is not None


# ---------------------------------------------------------------------------
# Mutation: markAllNotificationsRead
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMarkAllNotificationsRead:
    MUTATION = "mutation { markAllNotificationsRead }"

    def test_marks_all_unread_as_read(self):
        user = UserFactory()
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=False)
        _make_notification(user, is_read=True)

        result = schema.execute_sync(self.MUTATION, context_value=_ctx(user))
        assert result.errors is None
        assert result.data["markAllNotificationsRead"] == 2
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_does_not_affect_other_users(self):
        user = UserFactory()
        other = UserFactory()
        _make_notification(other, is_read=False)

        result = schema.execute_sync(self.MUTATION, context_value=_ctx(user))
        assert result.errors is None
        assert result.data["markAllNotificationsRead"] == 0
        assert Notification.objects.filter(user=other, is_read=False).count() == 1


# ---------------------------------------------------------------------------
# Mutation: clearAllNotifications
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestClearAllNotifications:
    MUTATION = "mutation { clearAllNotifications }"

    def test_deletes_all_notifications(self):
        user = UserFactory()
        _make_notification(user)
        _make_notification(user)

        result = schema.execute_sync(self.MUTATION, context_value=_ctx(user))
        assert result.errors is None
        assert result.data["clearAllNotifications"] == 2
        assert Notification.objects.filter(user=user).count() == 0

    def test_does_not_delete_other_users_notifications(self):
        user = UserFactory()
        other = UserFactory()
        _make_notification(other)

        result = schema.execute_sync(self.MUTATION, context_value=_ctx(user))
        assert result.errors is None
        assert Notification.objects.filter(user=other).count() == 1


# ---------------------------------------------------------------------------
# updateContract paused → notification side-effect
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestUpdateContractPausedNotification:
    MUTATION = """
        mutation UpdateContract($contractId: String!, $isActive: Boolean) {
            updateContract(contractId: $contractId, isActive: $isActive) {
                contractId
                isActive
            }
        }
    """

    def test_pausing_contract_creates_notification(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user, is_active=True)

        result = schema.execute_sync(
            self.MUTATION,
            variable_values={"contractId": contract.contract_id, "isActive": False},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert result.data["updateContract"]["isActive"] is False

        notif = Notification.objects.filter(
            user=user, notification_type="contract_paused"
        ).first()
        assert notif is not None
        assert contract.name in notif.message

    def test_activating_contract_does_not_create_notification(self):
        user = UserFactory()
        contract = TrackedContractFactory(owner=user, is_active=False)

        result = schema.execute_sync(
            self.MUTATION,
            variable_values={"contractId": contract.contract_id, "isActive": True},
            context_value=_ctx(user),
        )
        assert result.errors is None
        assert Notification.objects.filter(
            user=user, notification_type="contract_paused"
        ).count() == 0


# ---------------------------------------------------------------------------
# services/notifications.create_and_push
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCreateAndPush:
    def test_creates_notification_record(self):
        from soroscan.ingest.services.notifications import create_and_push

        user = UserFactory()
        with patch("soroscan.ingest.services.notifications.get_channel_layer", return_value=None):
            n = create_and_push(
                user=user,
                notification_type="system",
                title="Hello",
                message="World",
                link="/dashboard",
            )

        assert n.pk is not None
        assert n.user == user
        assert n.title == "Hello"
        assert n.link == "/dashboard"
        assert n.is_read is False

    def test_pushes_to_channel_layer(self):
        from soroscan.ingest.services.notifications import create_and_push

        user = UserFactory()
        mock_layer = Mock()

        with patch("soroscan.ingest.services.notifications.get_channel_layer", return_value=mock_layer):
            with patch("soroscan.ingest.services.notifications.async_to_sync") as mock_a2s:
                mock_send = Mock()
                mock_a2s.return_value = mock_send
                create_and_push(user=user, notification_type="alert", title="T", message="M")

        mock_a2s.assert_called_once_with(mock_layer.group_send)
        call_args = mock_send.call_args[0]
        assert call_args[0] == f"notifications_{user.pk}"
        assert call_args[1]["type"] == "notification.push"

    def test_channel_layer_failure_does_not_raise(self):
        from soroscan.ingest.services.notifications import create_and_push

        user = UserFactory()
        mock_layer = Mock()

        with patch("soroscan.ingest.services.notifications.get_channel_layer", return_value=mock_layer):
            with patch("soroscan.ingest.services.notifications.async_to_sync", side_effect=Exception("boom")):
                # Should not raise
                n = create_and_push(user=user, notification_type="system", title="T", message="M")

        assert n.pk is not None
