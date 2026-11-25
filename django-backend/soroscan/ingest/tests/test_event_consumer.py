from unittest.mock import ANY, AsyncMock, patch

import pytest
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator

from soroscan.ingest.routing import websocket_urlpatterns
from soroscan.ingest.tests.factories import TrackedContractFactory


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
class TestEventConsumer:
    @staticmethod
    async def create_contract(is_active=True):
        @database_sync_to_async
        def create():
            return TrackedContractFactory(is_active=is_active)

        return await create()

    @staticmethod
    def communicator(contract_id, query_string=""):
        path = f"/ws/events/{contract_id}/{query_string}"
        return WebsocketCommunicator(URLRouter(websocket_urlpatterns), path)

    async def test_connect_accepts_existing_contract(self):
        contract = await self.create_contract()
        communicator = self.communicator(contract.contract_id)

        connected, _ = await communicator.connect()
        assert connected
        await communicator.disconnect()

    async def test_connect_rejects_unknown_contract_with_close_code_4004(self):
        communicator = self.communicator(f"C{'Z' * 55}")

        connected, close_code = await communicator.connect()

        assert not connected
        assert close_code == 4004

    async def test_group_events_are_forwarded_as_json(self):
        contract = await self.create_contract()
        communicator = self.communicator(contract.contract_id)
        connected, _ = await communicator.connect()
        assert connected

        try:
            event_data = {"event_type": "swap", "amount": 42}
            await get_channel_layer().group_send(
                f"events_{contract.contract_id}",
                {"type": "contract_event", "data": event_data},
            )

            assert await communicator.receive_json_from(timeout=1) == event_data
        finally:
            await communicator.disconnect()

    async def test_event_type_filter_forwards_only_matching_events(self):
        contract = await self.create_contract()
        communicator = self.communicator(contract.contract_id, "?event_type=swap")
        connected, _ = await communicator.connect()
        assert connected

        try:
            group_name = f"events_{contract.contract_id}"
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                group_name,
                {
                    "type": "contract_event",
                    "data": {"event_type": "transfer", "amount": 9},
                },
            )
            assert await communicator.receive_nothing(timeout=0.1)

            matching_event = {"event_type": "swap", "amount": 42}
            await channel_layer.group_send(
                group_name,
                {"type": "contract_event", "data": matching_event},
            )
            assert await communicator.receive_json_from(timeout=1) == matching_event
        finally:
            await communicator.disconnect()

    async def test_disconnect_discards_channel_from_contract_group(self):
        contract = await self.create_contract()
        group_name = f"events_{contract.contract_id}"
        channel_layer = get_channel_layer()
        communicator = self.communicator(contract.contract_id)
        group_discard = AsyncMock(wraps=channel_layer.group_discard)

        with patch.object(channel_layer, "group_discard", group_discard):
            connected, _ = await communicator.connect()
            assert connected

            await communicator.disconnect()

        group_discard.assert_awaited_once_with(group_name, ANY)

    async def test_connect_accepts_malformed_query_string(self):
        contract = await self.create_contract()
        communicator = self.communicator(contract.contract_id, "?event_type=%FF")

        connected, _ = await communicator.connect()

        assert connected
        await communicator.disconnect()

    async def test_connect_rejects_inactive_contract(self):
        contract = await self.create_contract(is_active=False)
        communicator = self.communicator(contract.contract_id)

        connected, close_code = await communicator.connect()

        assert not connected
        assert close_code == 4004
