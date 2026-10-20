"""
Specification tests for issue #1672:
feat(sdk-ts): implement message buffering in WebSocketClient
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def test_websocket_client_sendMessage_is_public():
    ts_file = BASE_DIR / "sdk" / "typescript" / "src" / "websocket-client.ts"
    assert ts_file.exists(), f"websocket-client.ts must exist at {ts_file}"

    content = ts_file.read_text(encoding="utf-8")

    # Assert sendMessage is not private
    assert "private sendMessage" not in content, "sendMessage must not be private"
    assert "sendMessage(message: string): void" in content, "sendMessage public method signature must exist"


def test_websocket_client_buffering_and_flush_logic():
    ts_file = BASE_DIR / "sdk" / "typescript" / "src" / "websocket-client.ts"
    content = ts_file.read_text(encoding="utf-8")

    assert "getBufferSize(): number" in content
    assert "return this.messageBuffer.length;" in content
    assert "this.flushMessageBuffer();" in content
    assert "this.bufferMessage(message);" in content


def test_websocket_client_test_coverage_exists():
    test_file = BASE_DIR / "sdk" / "typescript" / "src" / "websocket-client.test.ts"
    assert test_file.exists(), f"websocket-client.test.ts must exist at {test_file}"

    content = test_file.read_text(encoding="utf-8")

    assert "should buffer messages when disconnected" in content
    assert "should flush buffer on connection open" in content
    assert "should send directly without buffering when already connected" in content
    assert "should respect max buffer size by dropping oldest message" in content
    assert "client.sendMessage" in content
