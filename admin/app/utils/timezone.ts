/**
 * Admin timezone utilities - mirrored from the main frontend
 */

export type TimezoneDisplay = 'local' | 'utc';

export function getAvailableTimezones(): string[] {
  const timezones = Intl.supportedValuesOf('timeZone') as string[];
  return timezones.sort();
}

export function getUserLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

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

export function getStoredTimezone(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }
  
  try {
    return localStorage.getItem('admin_timezone_preference') || getUserLocalTimezone();
  } catch {
    return getUserLocalTimezone();
  }
}

export function saveTimezonePreference(timezone: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem('admin_timezone_preference', timezone);
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function getTimezoneLabel(timezone: string): string {
  try {
    const offset = getTimezoneOffset(timezone);
    return `${timezone} (${offset})`;
  } catch {
    return timezone;
  }
}
