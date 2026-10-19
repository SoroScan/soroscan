"""
Unit tests for WebSocket EventConsumer query parameter parsing and event filtering.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from soroscan.ingest.consumers import EventConsumer


def _make_consumer(query_string=b"", contract_id="CB3SRMOGPKYI5RC7KMCZGXTGGMNBA6OOS3AX7XTJLTDSYOS62PFTKT5B", omit_qs=False):
    consumer = EventConsumer()
    scope = {
        "type": "websocket",
        "url_route": {"kwargs": {"contract_id": contract_id}},
    }
    if not omit_qs:
        scope["query_string"] = query_string
    consumer.scope = scope
    consumer.channel_layer = MagicMock()
    consumer.channel_layer.group_add = AsyncMock()
    consumer.channel_layer.group_discard = AsyncMock()
    consumer.channel_name = "test_channel"
    consumer.accept = AsyncMock()
    consumer.close = AsyncMock()
    consumer.send = AsyncMock()
    return consumer


@pytest.mark.asyncio
class TestEventConsumerQueryParams:
    async def test_connect_with_single_event_type(self):
        consumer = _make_consumer(query_string=b"event_type=transfer")
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type == "transfer"
        consumer.accept.assert_awaited_once()

    async def test_connect_with_multiple_query_params(self):
        consumer = _make_consumer(query_string=b"foo=bar&event_type=mint&baz=qux&limit=50")
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type == "mint"
        consumer.accept.assert_awaited_once()

    async def test_connect_with_url_encoded_value(self):
        consumer = _make_consumer(query_string=b"event_type=token%3Atransfer%20v1")
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type == "token:transfer v1"
        consumer.accept.assert_awaited_once()

    async def test_connect_with_repeated_event_type(self):
        consumer = _make_consumer(query_string=b"event_type=first&event_type=second")
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type == "first"
        consumer.accept.assert_awaited_once()

    @pytest.mark.parametrize(
        "qs",
        [
            b"",
            b"foo=bar&limit=10",
            b"event_type=",
            b"event_type=%20%20",
        ],
    )
    async def test_connect_without_event_type_means_no_filter(self, qs):
        consumer = _make_consumer(query_string=qs)
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type is None
        consumer.accept.assert_awaited_once()

    async def test_connect_missing_query_string_key(self):
        consumer = _make_consumer(omit_qs=True)
        with patch.object(EventConsumer, "get_contract", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock()
            await consumer.connect()

        assert consumer.event_type is None
        consumer.accept.assert_awaited_once()

    async def test_contract_event_filtering_with_filter(self):
        consumer = _make_consumer()
        consumer.event_type = "transfer"

        # Matching event should be sent
        await consumer.contract_event({"data": {"event_type": "transfer", "amount": 100}})
        consumer.send.assert_awaited_once()
        sent_payload = json.loads(consumer.send.call_args[1]["text_data"])
        assert sent_payload == {"event_type": "transfer", "amount": 100}

        # Non-matching event should be skipped
        consumer.send.reset_mock()
        await consumer.contract_event({"data": {"event_type": "mint", "amount": 50}})
        consumer.send.assert_not_awaited()

    async def test_contract_event_filtering_without_filter_sends_all(self):
        consumer = _make_consumer()
        consumer.event_type = None

        # Any event type should be sent when no filter is set
        await consumer.contract_event({"data": {"event_type": "transfer", "amount": 100}})
        assert consumer.send.await_count == 1

        await consumer.contract_event({"data": {"event_type": "mint", "amount": 50}})
        assert consumer.send.await_count == 2
