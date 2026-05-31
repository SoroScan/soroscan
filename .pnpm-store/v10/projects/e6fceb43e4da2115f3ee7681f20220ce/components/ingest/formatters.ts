import { formatDateInTimezone, formatDateOnlyInTimezone, formatTimeInTimezone, getUserLocalTimezone } from '@/lib/timezone';

export function formatDateTime(value: string, timezone?: string): string {
  const tz = timezone || getUserLocalTimezone();
  return formatDateInTimezone(value, tz);
}

export function formatDateOnly(value: string, timezone?: string): string {
  const tz = timezone || getUserLocalTimezone();
  return formatDateOnlyInTimezone(value, tz);
}

export function formatTimeOnly(value: string, timezone?: string): string {
  const tz = timezone || getUserLocalTimezone();
  return formatTimeInTimezone(value, tz);
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash || hash.length < 14) {
    return hash || "N/A";
  }
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function trimPayload(payload: unknown, maxLength = 180): string {
  const raw = JSON.stringify(payload ?? {});
  if (raw.length <= maxLength) {
    return raw;
  }
  return `${raw.slice(0, maxLength - 3)}...`;
}

export function validateDateRange(sinceValue: string, untilValue: string): string {
  if ((sinceValue && !untilValue) || (!sinceValue && untilValue)) {
    return "Provide both start and end dates, or leave both empty.";
  }

  if (sinceValue && untilValue && new Date(sinceValue) > new Date(untilValue)) {
    return "Date range is invalid: start date must be before end date.";
  }

  return "";
}

export function toIsoOrNull(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

export function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
