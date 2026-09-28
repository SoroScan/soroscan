"""
Custom migrate command that logs migration start/end with timestamps.

This wrapper provides clear visibility into migration progress in production.
"""
import logging
from datetime import UTC, datetime

from django.core.management.commands.migrate import Command as MigrateCommand
from django.db.migrations.executor import MigrationExecutor

logger = logging.getLogger("soroscan.migrate")


class Command(MigrateCommand):
    """
    Custom migrate command that logs each migration's start and completion.
    """

    def handle(self, *args, **options):
        # Patch the executor to log migrations
        original_apply = MigrationExecutor.apply_migration

        def logged_apply_migration(executor, project_state, migration, fake=False, fake_initial=False):
            migration_name = f"{migration.app_label}.{migration.name}"
            start_time = datetime.now(UTC)

            logger.info(
                f"Starting migration {migration_name}... "
                f"[timestamp={start_time.isoformat()}]"
            )

            try:
                result = original_apply(executor, project_state, migration, fake, fake_initial)
                end_time = datetime.now(UTC)
                duration = (end_time - start_time).total_seconds()

                logger.info(
                    f"Finished migration {migration_name}. "
                    f"[timestamp={end_time.isoformat()}, duration={duration:.2f}s]"
                )

                return result
            except Exception as e:
                end_time = datetime.now(UTC)
                duration = (end_time - start_time).total_seconds()

                logger.error(
                    f"Failed migration {migration_name}: {e} "
                    f"[timestamp={end_time.isoformat()}, duration={duration:.2f}s]"
                )
                raise

        MigrationExecutor.apply_migration = logged_apply_migration

        try:
            return super().handle(*args, **options)
        finally:
            # Restore original method
            MigrationExecutor.apply_migration = original_apply
