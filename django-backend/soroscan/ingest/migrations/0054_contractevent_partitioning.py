from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('ingest', '0053_webhook_replay_job'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- 1. Rename existing table
            ALTER TABLE ingest_contractevent RENAME TO ingest_contractevent_old;

            -- 2. Create the new partitioned table (multi-column range)
            CREATE TABLE ingest_contractevent (
                LIKE ingest_contractevent_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
            ) PARTITION BY RANGE ("timestamp", "ledger_sequence");

            -- 3. Create the initial active partitions
            CREATE TABLE ingest_contractevent_y2026m08 PARTITION OF ingest_contractevent 
                FOR VALUES FROM ('2026-08-01 00:00:00+00', MINVALUE) TO ('2026-09-01 00:00:00+00', MAXVALUE);
                
            CREATE TABLE ingest_contractevent_y2026m09 PARTITION OF ingest_contractevent 
                FOR VALUES FROM ('2026-09-01 00:00:00+00', MINVALUE) TO ('2026-10-01 00:00:00+00', MAXVALUE);

            -- 4. Migrate data (This will lock the table, schedule during maintenance)
            INSERT INTO ingest_contractevent SELECT * FROM ingest_contractevent_old;
            """,
            reverse_sql="""
            DROP TABLE ingest_contractevent;
            ALTER TABLE ingest_contractevent_old RENAME TO ingest_contractevent;
            """
        )
    ]