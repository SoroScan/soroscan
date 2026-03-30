"""Verify critical database indexes exist and are being used efficiently."""

from __future__ import annotations

from dataclasses import dataclass

from django.core.management.base import BaseCommand
from django.db import connection


@dataclass(frozen=True)
class IndexCheck:
    label: str
    table: str
    columns: tuple[str, ...]
    explain_sql: str
    create_sql: str


class Command(BaseCommand):
    help = "Verify that critical ingest indexes exist and flag potentially slow index usage."

    def handle(self, *args, **options):
        checks = [
            IndexCheck(
                label="contract_id",
                table="ingest_trackedcontract",
                columns=("contract_id",),
                explain_sql="SELECT id FROM ingest_trackedcontract WHERE contract_id = 'C00000000000000000000000000000000000000000000000000000000' LIMIT 1;",
                create_sql=(
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
                    "ingest_trackedcontract_contract_id_idx ON ingest_trackedcontract (contract_id);"
                ),
            ),
            IndexCheck(
                label="timestamp",
                table="ingest_contractevent",
                columns=("timestamp",),
                explain_sql="SELECT id FROM ingest_contractevent ORDER BY timestamp DESC LIMIT 50;",
                create_sql=(
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
                    "ingest_contractevent_timestamp_idx ON ingest_contractevent (timestamp DESC);"
                ),
            ),
            IndexCheck(
                label="ledger_sequence",
                table="ingest_contractinvocation",
                columns=("ledger_sequence",),
                explain_sql=(
                    "SELECT id FROM ingest_contractinvocation "
                    "WHERE ledger_sequence >= 0 ORDER BY ledger_sequence DESC LIMIT 50;"
                ),
                create_sql=(
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
                    "ingest_contractinvocation_ledger_sequence_idx "
                    "ON ingest_contractinvocation (ledger_sequence DESC);"
                ),
            ),
        ]

        missing: list[IndexCheck] = []
        slow: list[tuple[IndexCheck, str]] = []

        for item in checks:
            if not self._index_exists(item.table, item.columns):
                missing.append(item)
                continue

            issue = self._slow_index_issue(item)
            if issue:
                slow.append((item, issue))

        self.stdout.write(self.style.NOTICE("Index verification report:"))

        if not missing:
            self.stdout.write(self.style.SUCCESS("- No missing indexes detected."))
        else:
            self.stdout.write(self.style.WARNING(f"- Missing indexes: {len(missing)}"))
            for item in missing:
                self.stdout.write(f"  - {item.table}({', '.join(item.columns)}) [{item.label}]")

        if not slow:
            self.stdout.write(self.style.SUCCESS("- No slow-index warnings detected."))
        else:
            self.stdout.write(self.style.WARNING(f"- Potentially slow indexes: {len(slow)}"))
            for item, reason in slow:
                self.stdout.write(f"  - {item.table}({', '.join(item.columns)}) [{item.label}]: {reason}")

        if missing or slow:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Suggested SQL fixes:"))
            for item in missing:
                self.stdout.write(f"  {item.create_sql}")
            for item, _ in slow:
                self.stdout.write(f"  -- Review usage pattern for {item.label}")
                self.stdout.write(f"  {item.create_sql}")

        self.stdout.write(self.style.SUCCESS("Index verification completed."))

    def _index_exists(self, table: str, columns: tuple[str, ...]) -> bool:
        with connection.cursor() as cursor:
            constraints = connection.introspection.get_constraints(cursor, table)

        expected = list(columns)
        for detail in constraints.values():
            if not detail.get("index"):
                continue
            if detail.get("columns") == expected:
                return True
        return False

    def _slow_index_issue(self, item: IndexCheck) -> str | None:
        if connection.vendor != "postgresql":
            return None

        explain_sql = f"EXPLAIN (FORMAT JSON) {item.explain_sql}"
        with connection.cursor() as cursor:
            cursor.execute(explain_sql)
            row = cursor.fetchone()

        if not row:
            return None

        explain_root = row[0]
        try:
            plan = explain_root[0]["Plan"]
        except (TypeError, KeyError, IndexError):
            return None

        node_type = plan.get("Node Type", "Unknown")
        if node_type == "Seq Scan":
            return "query plan used sequential scan"
        return None
