"""SQLite PRAGMA tuning applied by settings_test.py (issue #1575)."""

import unittest

from django.db import connection
from django.test import SimpleTestCase


@unittest.skipUnless(
    connection.vendor == "sqlite",
    "PRAGMA tuning only applies to the sqlite test database "
    "(CI runs against Postgres via TEST_DATABASE_URL)",
)
class SqliteTestPragmaTests(SimpleTestCase):
    databases = {"default"}

    def _pragma(self, name):
        with connection.cursor() as cursor:
            cursor.execute(f"PRAGMA {name}")
            return cursor.fetchone()[0]

    def test_synchronous_is_off(self):
        # 0 == OFF
        self.assertEqual(self._pragma("synchronous"), 0)

    def test_journal_mode_is_memory(self):
        self.assertEqual(self._pragma("journal_mode").lower(), "memory")
