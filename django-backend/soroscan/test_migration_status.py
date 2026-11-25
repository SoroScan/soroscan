from io import StringIO
from django.core.management import call_command
from django.test import TestCase
from django.db import DEFAULT_DB_ALIAS

class MigrationStatusTest(TestCase):
    def test_migration_status_command_default_db(self):
        out = StringIO()
        call_command('migration_status', stdout=out)
        output = out.getvalue()
        
        self.assertIn(f"Checking migration status for database: {DEFAULT_DB_ALIAS}", output)
        self.assertIn("Migration status check complete.", output)
        self.assertIn("App:", output)
        # Verify status output formats are present
        self.assertTrue(" (Applied)" in output or " (Pending)" in output)

    def test_migration_status_command_custom_db(self):
        out = StringIO()
        # Verify that it respects the database routing flag
        call_command('migration_status', database=DEFAULT_DB_ALIAS, stdout=out)
        output = out.getvalue()
        
        self.assertIn(f"Checking migration status for database: {DEFAULT_DB_ALIAS}", output)
        self.assertIn("Migration status check complete.", output)
