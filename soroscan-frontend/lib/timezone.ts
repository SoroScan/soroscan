/**
 * Timezone utilities for formatting dates and managing timezone preferences
 */

export type TimezoneDisplay = 'local' | 'utc';

/**
 * Get list of available timezones
 */
export function getAvailableTimezones(): string[] {
  // Get all timezones from Intl
  const timezones = Intl.supportedValuesOf('timeZone') as string[];
  return timezones.sort();
}

/**
 * Get user's local timezone
 */
export function getUserLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Format date in specific timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  };

  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format time only in specific timezone
 */
export function formatTimeInTimezone(
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  };

  return dateObj.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format date only in specific timezone
 */
export function formatDateOnlyInTimezone(
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  };

  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Get timezone offset string for display (e.g., "UTC-5" or "UTC+2")
 */
export function getTimezoneOffset(timezone: string): string {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.abs(Math.floor(offset));
  const minutes = Math.abs((offset % 1) * 60);
  
  return `UTC${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

/**
 * Get stored timezone preference from localStorage
 */
export function getStoredTimezone(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }
  
  try {
    return localStorage.getItem('timezone_preference') || getUserLocalTimezone();
  } catch {
    return getUserLocalTimezone();
  }
}

/**
 * Save timezone preference to localStorage
 */
export function saveTimezonePreference(timezone: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem('timezone_preference', timezone);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get display label for timezone (e.g., "America/New_York (UTC-5)")
 */
export function getTimezoneLabel(timezone: string): string {
  try {
    const offset = getTimezoneOffset(timezone);
    return `${timezone} (${offset})`;
  } catch {
    return timezone;
  }
}
