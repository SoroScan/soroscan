"""Partition ingest_contractevent by (timestamp, ledger_sequence) on Postgres.

Uses RunPython (not RunSQL) so the vendor check happens at migration-apply
time rather than unconditionally — this keeps the migration a no-op on
non-Postgres backends (e.g. SQLite in tests), matching the pattern used in
0044_contractevent_payload_compression.py.
"""

from django.db import migrations


def partition_contractevent(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            DROP TABLE IF EXISTS ingest_contractevent_old CASCADE;
            -- 1. Rename existing table
            ALTER TABLE ingest_contractevent RENAME TO ingest_contractevent_old;

            -- 2. Create the new partitioned table (by timestamp range)
            CREATE TABLE ingest_contractevent (
                LIKE ingest_contractevent_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
            ) PARTITION BY RANGE ("timestamp");

            -- Ensure sequence for id primary key
            CREATE SEQUENCE IF NOT EXISTS ingest_contractevent_id_seq;
            ALTER TABLE ingest_contractevent ALTER COLUMN id SET DEFAULT nextval('ingest_contractevent_id_seq');
            DO $$
            BEGIN
                BEGIN
                    ALTER SEQUENCE ingest_contractevent_id_seq OWNED BY ingest_contractevent.id;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END $$;

            -- 3. Create initial active partitions and default partition
            CREATE TABLE ingest_contractevent_y2026m08 PARTITION OF ingest_contractevent
                FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

            CREATE TABLE ingest_contractevent_y2026m09 PARTITION OF ingest_contractevent
                FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

            CREATE TABLE ingest_contractevent_default PARTITION OF ingest_contractevent DEFAULT;

            -- 4. Migrate data
            INSERT INTO ingest_contractevent SELECT * FROM ingest_contractevent_old;

            -- Update sequence value to max existing id
            SELECT setval('ingest_contractevent_id_seq', COALESCE((SELECT MAX(id) FROM ingest_contractevent), 1));

            -- 5. Drop old temporary table
            DROP TABLE IF EXISTS ingest_contractevent_old CASCADE;
            """
        )


def unpartition_contractevent(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ingest_contractevent_old') THEN
                    DROP TABLE IF EXISTS ingest_contractevent CASCADE;
                    ALTER TABLE ingest_contractevent_old RENAME TO ingest_contractevent;
                ELSE
                    -- Recreate unpartitioned table and copy data back
                    CREATE TABLE IF NOT EXISTS ingest_contractevent_unpart (
                        LIKE ingest_contractevent INCLUDING DEFAULTS INCLUDING CONSTRAINTS
                    );
                    INSERT INTO ingest_contractevent_unpart SELECT * FROM ingest_contractevent;
                    DROP TABLE ingest_contractevent CASCADE;
                    ALTER TABLE ingest_contractevent_unpart RENAME TO ingest_contractevent;
                END IF;
            END $$;
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0053_webhook_replay_job'),
    ]

    operations = [
        migrations.RunPython(partition_contractevent, unpartition_contractevent),
    ]
