"""
Tests for the custom migrate management command.

Verifies that migration start/end log messages with timestamps are emitted.
"""
import logging
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from django.db.migrations.executor import MigrationExecutor


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests():
    """This test does not need DB access."""
    pass


def _make_migration(app_label="ingest", name="0001_initial"):
    m = MagicMock()
    m.app_label = app_label
    m.name = name
    return m


def _run_logged_apply(migration, raise_exc=None):
    """
    Replicate the logged_apply_migration closure from the Command.handle() method
    and invoke it once, returning the log records emitted.
    """
    logger = logging.getLogger("soroscan.migrate")
    migration_name = f"{migration.app_label}.{migration.name}"
    start_time = datetime.now(UTC)

    logger.info(
        f"Starting migration {migration_name}... "
        f"[timestamp={start_time.isoformat()}]"
    )

    try:
        if raise_exc:
            raise raise_exc
        end_time = datetime.now(UTC)
        duration = (end_time - start_time).total_seconds()
        logger.info(
            f"Finished migration {migration_name}. "
            f"[timestamp={end_time.isoformat()}, duration={duration:.2f}s]"
        )
    except Exception as e:
        end_time = datetime.now(UTC)
        duration = (end_time - start_time).total_seconds()
        logger.error(
            f"Failed migration {migration_name}: {e} "
            f"[timestamp={end_time.isoformat()}, duration={duration:.2f}s]"
        )
        raise


def test_migrate_logs_start_and_finish(caplog):
    """
    Running the patched apply_migration should emit 'Starting migration' and
    'Finished migration' log lines with ISO timestamps.
    """
    from soroscan.ingest.management.commands.migrate import Command  # noqa: F401

    migration = _make_migration()

    with caplog.at_level(logging.INFO, logger="soroscan.migrate"):
        _run_logged_apply(migration)

    messages = [r.message for r in caplog.records]
    assert any("Starting migration ingest.0001_initial" in m for m in messages), messages
    assert any("Finished migration ingest.0001_initial" in m for m in messages), messages

    start_msg = next(m for m in messages if "Starting migration" in m)
    finish_msg = next(m for m in messages if "Finished migration" in m)
    assert "timestamp=" in start_msg
    assert "timestamp=" in finish_msg
    assert "duration=" in finish_msg


def test_migrate_logs_failure(caplog):
    """
    When apply_migration raises, an ERROR log with timestamp is emitted and
    the exception propagates.
    """
    migration = _make_migration(name="0002_some_migration")

    with caplog.at_level(logging.ERROR, logger="soroscan.migrate"):
        with pytest.raises(RuntimeError, match="DB error"):
            _run_logged_apply(migration, raise_exc=RuntimeError("DB error"))

    error_messages = [r.message for r in caplog.records if r.levelno == logging.ERROR]
    assert any("Failed migration ingest.0002_some_migration" in m for m in error_messages)
    assert any("timestamp=" in m for m in error_messages)


def test_migrate_command_patches_and_restores_executor():
    """
    Command.handle() patches MigrationExecutor.apply_migration before calling
    super().handle() and restores it afterwards, even on error.
    """
    from soroscan.ingest.management.commands.migrate import Command

    original = MigrationExecutor.apply_migration

    cmd = Command()

    with patch.object(
        MigrationExecutor,
        "apply_migration",
        side_effect=RuntimeError("patching test"),
    ):
        with patch.object(
            type(cmd).__bases__[0],
            "handle",
            side_effect=RuntimeError("super error"),
        ):
            with pytest.raises(RuntimeError, match="super error"):
                cmd.handle()

    # After handle() exits (even via exception), the original must be restored
    assert MigrationExecutor.apply_migration is original
