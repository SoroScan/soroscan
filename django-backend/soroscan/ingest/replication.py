"""
Replication lag monitoring for multi-region database replication.

This module provides utilities to:
- Measure replication lag between primary and replica databases
- Expose metrics for monitoring in Prometheus
- Trigger alerts when lag exceeds configured thresholds
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from django.db import connections, DEFAULT_DB_ALIAS
from django.conf import settings

logger = logging.getLogger(__name__)


class ReplicationLagMonitor:
    """Monitor replication lag between primary and replica databases."""

    def __init__(self):
        self.primary_db_alias = DEFAULT_DB_ALIAS
        self.replica_db_alias = getattr(settings, "REPLICA_DB_ALIAS", "replica")
        self.last_check_time: Dict[str, datetime] = {}
        self.last_lag_value: Dict[str, Optional[float]] = {}
        self.lag_threshold_seconds = getattr(settings, "REPLICATION_LAG_THRESHOLD_SECONDS", 5.0)
        self.alert_threshold_seconds = getattr(settings, "REPLICATION_LAG_ALERT_THRESHOLD_SECONDS", 10.0)

    def measure_lag(self) -> Optional[float]:
        """
        Measure replication lag in seconds by comparing primary and replica LSN positions.

        For PostgreSQL, uses pg_current_wal_lsn() on primary and pg_last_wal_receive_lsn() on replica.
        Returns the lag in seconds or None if measurement fails.
        """
        try:
            # Get primary LSN
            primary_conn = connections[self.primary_db_alias]
            primary_lsn = self._get_primary_lsn(primary_conn)

            if not primary_lsn:
                logger.warning("Could not retrieve primary LSN")
                return None

            # Get replica LSN
            try:
                replica_conn = connections[self.replica_db_alias]
                replica_lsn = self._get_replica_lsn(replica_conn)
            except Exception as e:
                logger.warning(f"Could not connect to replica database: {e}")
                return None

            if not replica_lsn:
                logger.warning("Could not retrieve replica LSN")
                return None

            # Calculate lag based on LSN difference
            # For PostgreSQL: convert LSN to bytes for comparison
            lag_bytes = self._calculate_lsn_difference(primary_lsn, replica_lsn)

            # Estimate time lag (assuming ~10MB/s replication rate as baseline)
            # This is approximate; more accurate calculation would use actual write rate
            estimated_lag_seconds = max(0, lag_bytes / (10 * 1024 * 1024))

            return estimated_lag_seconds

        except Exception as e:
            logger.error(f"Error measuring replication lag: {e}", exc_info=True)
            return None

    def measure_lag_with_write_test(self) -> Optional[float]:
        """
        Measure replication lag using a write-test approach.

        Writes a timestamp to primary, then checks when it appears on replica.
        This is more accurate but involves actual database writes.
        """
        try:
            test_table = "replication_lag_test"
            test_key = f"test_{int(time.time() * 1000)}"

            primary_conn = connections[self.primary_db_alias]
            replica_conn = connections[self.replica_db_alias]

            # Ensure test table exists
            self._ensure_test_table(primary_conn, test_table)

            # Write to primary
            write_time = datetime.utcnow()
            with primary_conn.cursor() as cursor:
                cursor.execute(
                    f"INSERT INTO {test_table} (test_key, write_time) VALUES (%s, %s)",
                    [test_key, write_time],
                )
            primary_conn.commit()

            # Poll replica for the written value (with timeout)
            max_retries = 50  # 5 seconds max
            retry_count = 0

            while retry_count < max_retries:
                time.sleep(0.1)  # 100ms between checks
                try:
                    with replica_conn.cursor() as cursor:
                        cursor.execute(
                            f"SELECT write_time FROM {test_table} WHERE test_key = %s",
                            [test_key],
                        )
                        result = cursor.fetchone()
                        if result:
                            replica_write_time = result[0]
                            lag_seconds = (datetime.utcnow() - replica_write_time).total_seconds()
                            logger.debug(f"Replication lag measured: {lag_seconds:.3f}s")
                            return max(0, lag_seconds)
                except Exception as e:
                    logger.debug(f"Replica check attempt {retry_count}: {e}")

                retry_count += 1

            # Timeout - lag exceeded maximum test duration
            logger.warning("Replication lag exceeded max test duration (5s)")
            return 5.0

        except Exception as e:
            logger.error(f"Error in write-test replication lag measurement: {e}", exc_info=True)
            return None
        finally:
            # Cleanup test record
            try:
                with primary_conn.cursor() as cursor:
                    cursor.execute(
                        f"DELETE FROM {test_table} WHERE test_key = %s",
                        [test_key],
                    )
                primary_conn.commit()
            except Exception as e:
                logger.debug(f"Could not cleanup test record: {e}")

    def _get_primary_lsn(self, conn) -> Optional[str]:
        """Get current LSN on primary database."""
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT pg_current_wal_lsn();")
                result = cursor.fetchone()
                return result[0] if result else None
        except Exception as e:
            logger.debug(f"Error getting primary LSN: {e}")
            return None

    def _get_replica_lsn(self, conn) -> Optional[str]:
        """Get last replayed LSN on replica database."""
        try:
            with conn.cursor() as cursor:
                # Try to get replay LSN (works on physical replicas)
                cursor.execute("SELECT pg_last_wal_replay_lsn();")
                result = cursor.fetchone()
                return result[0] if result else None
        except Exception as e:
            logger.debug(f"Error getting replica LSN: {e}")
            return None

    def _calculate_lsn_difference(self, primary_lsn: str, replica_lsn: str) -> int:
        """Calculate difference between two LSN values in bytes."""
        try:
            # LSN format: XXXXXXXX/XXXXXXXX
            if not primary_lsn or not replica_lsn:
                return 0

            # Convert LSN strings to comparable integers
            primary_hex = primary_lsn.replace("/", "")
            replica_hex = replica_lsn.replace("/", "")

            primary_bytes = int(primary_hex, 16)
            replica_bytes = int(replica_hex, 16)

            return max(0, primary_bytes - replica_bytes)
        except Exception as e:
            logger.debug(f"Error calculating LSN difference: {e}")
            return 0

    def _ensure_test_table(self, conn, table_name: str) -> None:
        """Create replication lag test table if it doesn't exist."""
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        id SERIAL PRIMARY KEY,
                        test_key VARCHAR(100) UNIQUE,
                        write_time TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                    """
                )
            conn.commit()
        except Exception as e:
            logger.debug(f"Error creating test table: {e}")

    def get_replica_status(self) -> Optional[Dict[str, Any]]:
        """Get comprehensive replica status information."""
        try:
            replica_conn = connections[self.replica_db_alias]
            with replica_conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        pg_is_in_recovery() as is_standby,
                        pg_last_wal_receive_lsn() as receive_lsn,
                        pg_last_wal_replay_lsn() as replay_lsn,
                        NOW() - pg_postmaster_start_time() as uptime,
                        EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time())) as uptime_seconds
                    """
                )
                result = cursor.fetchone()
                if result:
                    return {
                        "is_standby": result[0],
                        "receive_lsn": str(result[1]) if result[1] else None,
                        "replay_lsn": str(result[2]) if result[2] else None,
                        "uptime": str(result[3]) if result[3] else None,
                        "uptime_seconds": result[4],
                    }
        except Exception as e:
            logger.debug(f"Error getting replica status: {e}")

        return None

    def check_and_alert(self, lag_seconds: Optional[float]) -> Optional[Dict[str, Any]]:
        """
        Check if lag exceeds thresholds and generate alert info.

        Returns alert info if lag exceeds alert threshold, None otherwise.
        """
        if lag_seconds is None:
            return None

        if lag_seconds > self.alert_threshold_seconds:
            return {
                "severity": "critical",
                "lag_seconds": lag_seconds,
                "threshold_seconds": self.alert_threshold_seconds,
                "message": f"Replication lag ({lag_seconds:.2f}s) exceeds critical threshold ({self.alert_threshold_seconds}s)",
            }
        elif lag_seconds > self.lag_threshold_seconds:
            return {
                "severity": "warning",
                "lag_seconds": lag_seconds,
                "threshold_seconds": self.lag_threshold_seconds,
                "message": f"Replication lag ({lag_seconds:.2f}s) exceeds warning threshold ({self.lag_threshold_seconds}s)",
            }

        return None


# Global instance
_monitor_instance: Optional[ReplicationLagMonitor] = None


def get_monitor() -> ReplicationLagMonitor:
    """Get or create the global ReplicationLagMonitor instance."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = ReplicationLagMonitor()
    return _monitor_instance
