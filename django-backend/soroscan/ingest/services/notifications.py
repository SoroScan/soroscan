"""
Notification service — creates Notification records and pushes them
to the user's WebSocket group via Django Channels.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

logger = logging.getLogger(__name__)


def create_and_push(
    user: "AbstractBaseUser",
    notification_type: str,
    title: str,
    message: str,
    link: str = "",
) -> "Notification":  # noqa: F821
    """
    Persist a Notification and broadcast it to the user's WS group.
    Safe to call from Celery tasks (sync context).
    """
    from soroscan.ingest.models import Notification

    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
    )

    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"notifications_{user.pk}"
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.push",
                    "notification_id": notification.id,
                },
            )
        except Exception:
            logger.exception("Failed to push notification %s to channel layer", notification.id)

    return notification
