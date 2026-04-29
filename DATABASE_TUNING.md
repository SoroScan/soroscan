# PostgreSQL Tuning for High-Volume Indexing

SoroScan is a **write-heavy** workload: the indexer continuously inserts contract events, invocations, and webhook delivery logs. Default PostgreSQL settings are tuned for small, general-purpose workloads and will become a bottleneck as indexing volume grows. This document provides recommended settings and explains why each matters.

---

## Key Parameters

### `shared_buffers`

PostgreSQL's in-memory page cache. The single most impactful setting for write-heavy workloads.

| Server RAM | Recommended value |
|---|---|
| 8 GB | `2GB` |
| 16 GB | `4GB` |
| 32 GB | `8GB` |
| 64 GB+ | `16GB` |

**Why:** SoroScan repeatedly reads and updates the same contract and event rows. A larger shared buffer keeps hot pages in memory, reducing disk I/O on every INSERT/UPDATE.

```
shared_buffers = 4GB   # for a 16 GB server
```

---

### `effective_cache_size`

Tells the query planner how much memory is available for caching (shared_buffers + OS page cache). Does **not** allocate memory — it only influences plan selection.

```
effective_cache_size = 12GB   # ~75% of total RAM on a 16 GB server
```

**Why:** A higher value encourages the planner to choose index scans over sequential scans, which is critical for the time-range and contract-filtered queries SoroScan runs.

---

### `work_mem`

Memory allocated **per sort/hash operation per query**. Multiple operations in a single query each get this amount.

```
work_mem = 64MB
```

**Why:** SoroScan's analytics and backfill queries involve large sorts and hash joins over event tables. Insufficient `work_mem` forces these to spill to disk (temp files), causing severe slowdowns.

> ⚠️ Set conservatively: `work_mem` × max_connections × operations_per_query can exceed total RAM. Start at `32MB`–`64MB` and increase only if `EXPLAIN ANALYZE` shows disk sorts.

---

### `maintenance_work_mem`

Memory for maintenance operations: `VACUUM`, `CREATE INDEX`, `ALTER TABLE`.

```
maintenance_work_mem = 512MB
```

**Why:** SoroScan's GIN indexes on `payload` JSONB columns are expensive to build and autovacuum. More memory here speeds up index maintenance and reduces autovacuum duration.

---

### `wal_buffers`

Write-Ahead Log buffer size. Relevant for write-heavy workloads.

```
wal_buffers = 64MB
```

**Why:** The default (`-1`, auto-tuned to 1/32 of `shared_buffers`) is often too small for high-throughput ingestion. A fixed `64MB` reduces WAL write latency.

---

### `checkpoint_completion_target`

Spreads checkpoint I/O over a longer window to avoid I/O spikes.

```
checkpoint_completion_target = 0.9
```

**Why:** Without this, checkpoints flush all dirty pages at once, causing latency spikes during peak ingestion.

---

### `max_wal_size`

Maximum WAL size before a checkpoint is forced.

```
max_wal_size = 4GB
```

**Why:** Larger WAL size means fewer forced checkpoints during bulk ingestion bursts, reducing I/O pressure.

---

### `random_page_cost`

Cost estimate for a random disk page fetch. Lower values favour index scans.

```
# For SSD storage:
random_page_cost = 1.1

# For HDD storage (default):
random_page_cost = 4.0
```

**Why:** SoroScan is typically deployed on SSD-backed cloud instances. Setting `random_page_cost = 1.1` tells the planner that random reads are nearly as cheap as sequential reads, enabling better index usage.

---

### `autovacuum_vacuum_scale_factor` / `autovacuum_analyze_scale_factor`

Controls how frequently autovacuum runs relative to table size.

```
autovacuum_vacuum_scale_factor = 0.01    # vacuum after 1% of rows change (default: 20%)
autovacuum_analyze_scale_factor = 0.005  # analyze after 0.5% of rows change (default: 10%)
```

**Why:** SoroScan's `contract_events` table grows continuously. With the default 20% threshold, autovacuum may not run until millions of dead tuples accumulate, causing table bloat and query slowdowns.

---

## Complete `postgresql.conf` Snippet

```ini
# Memory
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB             # 75% of RAM
work_mem = 64MB
maintenance_work_mem = 512MB

# WAL / Checkpoints
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

# Planner
random_page_cost = 1.1                  # SSD; use 4.0 for HDD

# Autovacuum (tuned for high-write tables)
autovacuum_vacuum_scale_factor = 0.01
autovacuum_analyze_scale_factor = 0.005
```

Adjust `shared_buffers`, `effective_cache_size`, and `work_mem` proportionally for your server's RAM using the table above.

---

## Applying Changes

Most settings require a PostgreSQL restart:

```bash
# Edit postgresql.conf, then:
pg_ctlcluster 15 main restart

# Or in Docker:
docker compose restart postgres
```

`work_mem` and `autovacuum_*` can be reloaded without a restart:

```bash
SELECT pg_reload_conf();
```

---

## Verifying Impact

```sql
-- Check current settings
SHOW shared_buffers;
SHOW work_mem;

-- Check for disk sorts (should be 0 or very low)
SELECT * FROM pg_stat_statements WHERE temp_blks_written > 0 ORDER BY temp_blks_written DESC LIMIT 10;

-- Check autovacuum activity on the events table
SELECT relname, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname = 'ingest_contractevent';
```

---

## Further Reading

- [PostgreSQL Tuning Guide (PGTune)](https://pgtune.leopard.in.ua/)
- [PostgreSQL Documentation: Resource Consumption](https://www.postgresql.org/docs/current/runtime-config-resource.html)
- [PostgreSQL Documentation: WAL Configuration](https://www.postgresql.org/docs/current/runtime-config-wal.html)
