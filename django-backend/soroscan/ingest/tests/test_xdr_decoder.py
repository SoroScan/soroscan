from stellar_sdk import Keypair, scval

from soroscan.ingest.stellar_client import XDRDecoder


def _event_xdr(event_type: str, payload: dict):
    topics = [scval.to_symbol(event_type)]
    encoded_payload = scval.to_map(
        {scval.to_symbol(key): value for key, value in payload.items()}
    )
    return [topic.to_xdr_bytes() for topic in topics], encoded_payload.to_xdr_bytes()


def test_decodes_swap_event_xdr_into_json_primitives():
    trader = Keypair.random().public_key
    topics, payload = _event_xdr(
        "swap",
        {
            "trader": scval.to_address(trader),
            "amount_in": scval.to_uint64(125),
            "amount_out": scval.to_uint64(120),
            "pool_id": scval.to_bytes(bytes.fromhex("ab" * 32)),
        },
    )

    decoded = XDRDecoder.decode_event(topics, payload)
    assert decoded == {
        "topics": ["swap"],
        "payload": {
            "amount_in": 125,
            "amount_out": 120,
            "pool_id": "0x" + "ab" * 32,
            "trader": trader,
        },
    }


def test_decodes_transfer_event_addresses_symbol_and_amount():
    sender = Keypair.random().public_key
    recipient = Keypair.random().public_key
    topics, payload = _event_xdr(
        "transfer",
        {
            "from": scval.to_address(sender),
            "to": scval.to_address(recipient),
            "amount": scval.to_uint128(1_000_000),
            "asset": scval.to_symbol("USDC"),
        },
    )

    decoded = XDRDecoder.decode_event(topics, payload)
    assert decoded["topics"] == ["transfer"]
    assert decoded["payload"]["from"] == sender
    assert decoded["payload"]["to"] == recipient
    assert decoded["payload"]["amount"] == 1_000_000
    assert decoded["payload"]["asset"] == "USDC"


def test_decodes_deposit_event_map_and_bytesn_payload():
    provider = Keypair.random().public_key
    topics, payload = _event_xdr(
        "deposit",
        {
            "provider": scval.to_address(provider),
            "shares": scval.to_uint64(500),
            "reserve_a": scval.to_uint64(250),
            "reserve_b": scval.to_uint64(750),
            "receipt": scval.to_bytes(bytes.fromhex("cd" * 32)),
        },
    )

    decoded = XDRDecoder.decode_event(topics, payload)
    assert decoded["topics"] == ["deposit"]
    assert decoded["payload"] == {
        "provider": provider,
        "receipt": "0x" + "cd" * 32,
        "reserve_a": 250,
        "reserve_b": 750,
        "shares": 500,
    }


def test_decode_accepts_scval_objects_directly():
    assert XDRDecoder.decode(scval.to_symbol("swap")) == "swap"
