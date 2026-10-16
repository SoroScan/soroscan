"use client"

import * as React from "react"

export interface TimeRange {
  from: Date
  to: Date
  timezone: string
}

interface TimeRangePickerProps {
  value?: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

const PRESETS = [
  { label: "Last 1h",  minutes: 60 },
  { label: "Last 24h", minutes: 1440 },
  { label: "Last 7d",  minutes: 10080 },
  { label: "Last 30d", minutes: 43200 },
] as const

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
]

function toLocalInput(date: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
  } catch {
    return ""
  }
}

function fromLocalInput(value: string, tz: string): Date {
  // Parse the datetime-local string as if it's in the given timezone
  const [datePart, timePart] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number)
  // Use Intl to find the UTC offset for this tz at this moment
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const offsetMs = getTimezoneOffsetMs(naive, tz)
  return new Date(naive.getTime() - offsetMs)
}

function getTimezoneOffsetMs(date: Date, tz: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" })
  const tzStr  = date.toLocaleString("en-US", { timeZone: tz })
  return new Date(utcStr).getTime() - new Date(tzStr).getTime()
}

function formatUTC(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

export function TimeRangePicker({ value, onChange, className = "" }: TimeRangePickerProps) {
  const now = new Date()
  const defaultRange: TimeRange = {
    from: new Date(now.getTime() - 60 * 60 * 1000),
    to: now,
    timezone: "UTC",
  }
  const range = value ?? defaultRange

  const [tz, setTz] = React.useState(range.timezone)
  const [fromInput, setFromInput] = React.useState(() => toLocalInput(range.from, range.timezone))
  const [toInput, setToInput]     = React.useState(() => toLocalInput(range.to,   range.timezone))
  const [activePreset, setActivePreset] = React.useState<number | null>(null)

  // Sync inputs when tz changes
  React.useEffect(() => {
    setFromInput(toLocalInput(range.from, tz))
    setToInput(toLocalInput(range.to, tz))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tz])

  const applyPreset = (minutes: number, idx: number) => {
    const to   = new Date()
    const from = new Date(to.getTime() - minutes * 60 * 1000)
    setActivePreset(idx)
    setFromInput(toLocalInput(from, tz))
    setToInput(toLocalInput(to, tz))
    onChange({ from, to, timezone: tz })
  }

  const handleFromChange = (v: string) => {
    setFromInput(v)
    setActivePreset(null)
    if (v) {
      const from = fromLocalInput(v, tz)
      const to   = toInput ? fromLocalInput(toInput, tz) : range.to
      onChange({ from, to, timezone: tz })
    }
  }

  const handleToChange = (v: string) => {
    setToInput(v)
    setActivePreset(null)
    if (v) {
      const from = fromInput ? fromLocalInput(fromInput, tz) : range.from
      const to   = fromLocalInput(v, tz)
      onChange({ from, to, timezone: tz })
    }
  }

  const handleTzChange = (newTz: string) => {
    setTz(newTz)
    onChange({ from: range.from, to: range.to, timezone: newTz })
  }

  return (
    <div className={`border border-terminal-green/30 bg-terminal-black p-4 font-terminal-mono space-y-4 ${className}`} role="group" aria-label="Time range picker">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.minutes, i)}
            className={`text-[10px] px-3 py-1 border transition-colors ${
              activePreset === i
                ? "border-terminal-green bg-terminal-green/20 text-terminal-green"
                : "border-terminal-green/30 text-terminal-gray hover:border-terminal-green hover:text-terminal-green"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] text-terminal-gray">FROM</span>
          <input
            type="datetime-local"
            value={fromInput}
            onChange={(e) => handleFromChange(e.target.value)}
            className="w-full bg-transparent border border-terminal-green/30 text-terminal-green text-[11px] px-2 py-1.5 focus:outline-none focus:border-terminal-green"
            aria-label="From date and time"
          />
          {fromInput && (
            <div className="text-[9px] text-terminal-gray/60">{formatUTC(fromLocalInput(fromInput, tz))}</div>
          )}
        </label>

        <label className="space-y-1">
          <span className="text-[10px] text-terminal-gray">TO</span>
          <input
            type="datetime-local"
            value={toInput}
            onChange={(e) => handleToChange(e.target.value)}
            className="w-full bg-transparent border border-terminal-green/30 text-terminal-green text-[11px] px-2 py-1.5 focus:outline-none focus:border-terminal-green"
            aria-label="To date and time"
          />
          {toInput && (
            <div className="text-[9px] text-terminal-gray/60">{formatUTC(fromLocalInput(toInput, tz))}</div>
          )}
        </label>
      </div>

      {/* Timezone */}
      <label className="flex items-center gap-3">
        <span className="text-[10px] text-terminal-gray shrink-0">TIMEZONE</span>
        <select
          value={tz}
          onChange={(e) => handleTzChange(e.target.value)}
          className="flex-1 bg-transparent border border-terminal-green/30 text-terminal-green text-[11px] px-2 py-1.5 focus:outline-none focus:border-terminal-green"
          aria-label="Timezone"
        >
          {TIMEZONES.map((t) => (
            <option key={t} value={t} className="bg-[#0a0e27]">{t}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
