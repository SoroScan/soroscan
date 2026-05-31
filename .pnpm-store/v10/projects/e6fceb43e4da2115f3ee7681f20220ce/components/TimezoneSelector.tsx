'use client';

import React, { useMemo } from 'react';
import { useTimezone } from '@/context/TimezoneContext';
import { getAvailableTimezones, getTimezoneLabel } from '@/lib/timezone';
import styles from './TimezoneSelector.module.css';

interface TimezoneSelectorProps {
  className?: string;
}

export function TimezoneSelector({ className }: TimezoneSelectorProps) {
  const { timezone, setTimezone, displayMode, setDisplayMode } = useTimezone();
  
  const timezones = useMemo(() => getAvailableTimezones(), []);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.group}>
        <label htmlFor="timezone-select" className={styles.label}>
          Timezone:
        </label>
        <select
          id="timezone-select"
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
