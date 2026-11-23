from io import StringIO
from unittest.mock import MagicMock
import pytest
from django.core.management import call_command


# ==============================================================================
# clear_contract_cache tests
# ==============================================================================


def test_clear_contract_cache_no_keys_found(mocker):
    mock_redis = MagicMock()
    mock_redis.scan_iter.return_value = iter([])

    mock_cache = MagicMock()
    mock_cache.client.get_client.return_value = mock_redis
    mocker.patch("soroscan.ingest.management.commands.clear_contract_cache.cache", mock_cache)

    out = StringIO()
    call_command("clear_contract_cache", stdout=out)

    output = out.getvalue()
    assert "No contract cache keys found" in output
    mock_redis.scan_iter.assert_called_once_with(match="soroscan:contract:*", count=1000)
    mock_redis.delete.assert_not_called()


def test_clear_contract_cache_dry_run(mocker):
    keys = [b"soroscan:contract:111", "soroscan:contract:222"]
    mock_redis = MagicMock()
    mock_redis.scan_iter.return_value = iter(keys)

    mock_cache = MagicMock()
    mock_cache.client.get_client.return_value = mock_redis
    mocker.patch("soroscan.ingest.management.commands.clear_contract_cache.cache", mock_cache)

    out = StringIO()
    call_command("clear_contract_cache", dry_run=True, stdout=out)

    output = out.getvalue()
    assert "DRY RUN: Would delete 2 cache keys matching 'soroscan:contract:*'" in output
    assert "soroscan:contract:111" in output
    assert "soroscan:contract:222" in output
    mock_redis.delete.assert_not_called()


def test_clear_contract_cache_real_delete(mocker):
    keys = [b"soroscan:contract:AAA", b"soroscan:contract:BBB"]
    mock_redis = MagicMock()
    mock_redis.scan_iter.return_value = iter(keys)
    mock_redis.delete.return_value = 2

    mock_cache = MagicMock()
    mock_cache.client.get_client.return_value = mock_redis
    mocker.patch("soroscan.ingest.management.commands.clear_contract_cache.cache", mock_cache)

    out = StringIO()
    call_command("clear_contract_cache", stdout=out)

    output = out.getvalue()
    assert "Successfully deleted 2 cache keys matching 'soroscan:contract:*'" in output
    mock_redis.delete.assert_called_once_with(*keys)


# ==============================================================================
# check_redis tests
# ==============================================================================


def test_check_redis_healthy_with_ping_client(mocker):
    mock_client = MagicMock()
    mock_client.ping.return_value = True

    mock_cache = MagicMock()
    mock_cache._cache = None
    mock_cache.client = MagicMock(spec=["get_client"])
    mock_cache.client.get_client.return_value = mock_client
    mock_cache.get.side_effect = lambda key: "ok" if key == "soroscan:check_redis:probe" else None

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    call_command("check_redis", stdout=out, stderr=err)

    output = out.getvalue()
    assert "✓ Ping OK" in output
    assert "✓ Cache SET OK" in output
    assert "✓ Cache GET OK" in output
    assert "Redis is reachable and healthy" in output
    mock_client.ping.assert_called_once()
    mock_cache.set.assert_called_once_with("soroscan:check_redis:probe", "ok", timeout=10)
    mock_cache.delete.assert_called_once_with("soroscan:check_redis:probe")


def test_check_redis_healthy_with_direct_client_ping(mocker):
    mock_client = MagicMock()
    mock_client.ping.return_value = True

    mock_cache = MagicMock()
    mock_cache._cache = mock_client
    mock_cache.get.side_effect = lambda key: "ok" if key == "soroscan:check_redis:probe" else None

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    call_command("check_redis", stdout=out)

    output = out.getvalue()
    assert "✓ Ping OK" in output
    assert "Redis is reachable and healthy" in output
    mock_client.ping.assert_called_once()


def test_check_redis_healthy_with_fallback_probe(mocker):
    # Cache without .client or ._cache attributes to exercise the fallback branch
    mock_cache = MagicMock(spec=["get", "set", "delete"])
    mock_cache.get.side_effect = lambda key: "ok" if key == "soroscan:check_redis:probe" else None

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    call_command("check_redis", stdout=out)

    output = out.getvalue()
    assert "✓ Ping OK" in output
    assert "✓ Cache SET OK" in output
    assert "✓ Cache GET OK" in output
    assert "Redis is reachable and healthy" in output
    mock_cache.get.assert_any_call("soroscan:check_redis:ping_probe")


def test_check_redis_ping_failure(mocker):
    mock_cache = MagicMock()
    mock_cache.get.side_effect = ConnectionError("Could not connect to Redis at localhost:6379")

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    with pytest.raises(SystemExit) as exc_info:
        call_command("check_redis", stdout=out, stderr=err)

    assert exc_info.value.code == 1
    assert "✗ Ping failed: Could not connect to Redis" in err.getvalue()


def test_check_redis_client_ping_method_failure(mocker):
    mock_client = MagicMock()
    mock_client.ping.side_effect = ConnectionError("Connection dropped during PING")

    mock_cache = MagicMock()
    mock_cache._cache = None
    mock_cache.client = MagicMock(spec=["get_client"])
    mock_cache.client.get_client.return_value = mock_client
    mock_cache.get.return_value = None

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    with pytest.raises(SystemExit) as exc_info:
        call_command("check_redis", stdout=out, stderr=err)

    assert exc_info.value.code == 1
    assert "✗ Ping failed: Connection dropped during PING" in err.getvalue()


def test_check_redis_cache_set_failure(mocker):
    mock_cache = MagicMock()
    mock_cache.get.return_value = None
    mock_cache.client.get_client().ping.return_value = True
    mock_cache.set.side_effect = Exception("Read-only file system or full memory")

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    with pytest.raises(SystemExit) as exc_info:
        call_command("check_redis", stdout=out, stderr=err)

    assert exc_info.value.code == 1
    assert "✓ Ping OK" in out.getvalue()
    assert "✗ Cache SET failed: Read-only file system or full memory" in err.getvalue()


def test_check_redis_cache_get_exception(mocker):
    mock_cache = MagicMock()
    # First get is during ping, second is read_back which raises
    mock_cache.get.side_effect = [None, Exception("Timeout reading probe key")]
    mock_cache.client.get_client().ping.return_value = True

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    with pytest.raises(SystemExit) as exc_info:
        call_command("check_redis", stdout=out, stderr=err)

    assert exc_info.value.code == 1
    assert "✓ Ping OK" in out.getvalue()
    assert "✓ Cache SET OK" in out.getvalue()
    assert "✗ Cache GET failed: Timeout reading probe key" in err.getvalue()


def test_check_redis_cache_get_mismatched_value(mocker):
    mock_cache = MagicMock()
    # First get is ping, second is read_back returning unexpected value
    mock_cache.get.side_effect = [None, "wrong_value"]
    mock_cache.client.get_client().ping.return_value = True

    mocker.patch("soroscan.ingest.management.commands.check_redis.cache", mock_cache)

    out = StringIO()
    err = StringIO()
    with pytest.raises(SystemExit) as exc_info:
        call_command("check_redis", stdout=out, stderr=err)

    assert exc_info.value.code == 1
    assert "✓ Ping OK" in out.getvalue()
    assert "✓ Cache SET OK" in out.getvalue()
    assert "✗ Cache GET returned unexpected value: 'wrong_value'" in err.getvalue()
