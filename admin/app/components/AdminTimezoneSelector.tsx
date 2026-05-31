'use client';

import React, { useMemo } from 'react';
import { useAdminTimezone } from '../context/AdminTimezoneContext';
import { getAvailableTimezones, getTimezoneLabel } from '../utils/timezone';
import styles from './AdminTimezoneSelector.module.css';

interface AdminTimezoneSelectorProps {
  className?: string;
}

export function AdminTimezoneSelector({ className }: AdminTimezoneSelectorProps) {
  const { timezone, setTimezone, displayMode, setDisplayMode } = useAdminTimezone();
  
  const timezones = useMemo(() => getAvailableTimezones(), []);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.group}>
        <label htmlFor="admin-timezone-select" className={styles.label}>
          Timezone:
        </label>
        <select
          id="admin-timezone-select"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={styles.select}
          title="Select your timezone"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {getTimezoneLabel(tz)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Display:</label>
        <div className={styles.toggleGroup}>
          <button
            className={`${styles.toggleButton} ${displayMode === 'local' ? styles.active : ''}`}
            onClick={() => setDisplayMode('local')}
            type="button"
            title="Show timestamps in your local timezone"
          >
            Local
          </button>
          <button
            className={`${styles.toggleButton} ${displayMode === 'utc' ? styles.active : ''}`}
            onClick={() => setDisplayMode('utc')}
            type="button"
            title="Show timestamps in UTC"
          >
            UTC
          </button>
        </div>
      </div>
    </div>
  );
}
