"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

type RangeKey = "24h" | "7d" | "30d"

interface DataPoint {
  label: string
  successRate: number
  deliveries: number
}

interface WebhookSuccessChartProps {
  baseSuccessRate: number
  loading?: boolean
}

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
]

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function generateSeries(baseSuccessRate: number, range: RangeKey): DataPoint[] {
  const points = range === "24h" ? 24 : range === "7d" ? 7 : 30
  const now = new Date()
  const base = clamp(baseSuccessRate || 90, 55, 100)

  return Array.from({ length: points }).map((_, index) => {
    const variation = Math.sin((index / points) * Math.PI * 1.2) * 4
    const drift = ((index - points / 2) / points) * 3
    const jump = ((index * 7) % 11) - 5
    const successRate = clamp(Math.round(base + variation + drift + jump), 60, 100)
    const deliveries = Math.max(12, Math.round((successRate / 100) * (40 + index * 2)))

    let label = ""
    if (range === "24h") {
      const hour = new Date(now.getTime() - (points - index - 1) * 60 * 60 * 1000).getHours()
      label = `${hour.toString().padStart(2, "0")}:00`
    } else if (range === "7d") {
      const date = new Date(now.getTime() - (points - index - 1) * 24 * 60 * 60 * 1000)
      label = date.toLocaleDateString("en-GB", { weekday: "short" })
    } else {
      const date = new Date(now.getTime() - (points - index - 1) * 24 * 60 * 60 * 1000)
      label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    }

    return {
      label,
      successRate,
      deliveries,
    }
  })
}

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: any; label?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0].payload as DataPoint

  return (
    <div className="rounded border border-terminal-green/40 bg-terminal-black p-3 text-[10px] text-terminal-gray shadow-glow-green">
      <div className="text-terminal-green font-bold mb-1">{label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-3">
          <span>Success Rate</span>
          <span className="font-semibold text-terminal-green">{point.successRate}%</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Deliveries</span>
          <span className="font-semibold">{point.deliveries}</span>
        </div>
      </div>
    </div>
  )
}

export function WebhookSuccessChart({ baseSuccessRate, loading = false }: WebhookSuccessChartProps) {
  const [range, setRange] = React.useState<RangeKey>("24h")

  const data = React.useMemo(() => generateSeries(baseSuccessRate, range), [baseSuccessRate, range])

  return (
    <div className="border border-terminal-green/30 p-6 bg-terminal-black h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xs font-bold text-terminal-green tracking-widest uppercase mb-2">[WEBHOOK_SUCCESS_TREND]</h3>
          <p className="text-[10px] text-terminal-gray uppercase tracking-widest">Success rate over time</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest transition ${range === option.value ? "border-terminal-green bg-terminal-green/10 text-terminal-green" : "border-terminal-green/20 text-terminal-gray hover:border-terminal-green/40 hover:text-terminal-green"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-terminal-gray text-sm uppercase animate-pulse">
            LOADING_CHART...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#1B332E" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#7DDC8A" tick={{ fill: "#94A3B8", fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[50, 100]} tick={{ fill: "#94A3B8", fontSize: 10 }} tickFormatter={(value) => `${value}%`} />
              <Tooltip content={<TooltipContent />} cursor={{ stroke: "#0F4E37", strokeWidth: 1 }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 12 }} />
              <Line
                type="monotone"
                dataKey="successRate"
                name="Success Rate"
                stroke="#22C55E"
                strokeWidth={3}
                dot={{ r: 3, fill: "#22C55E" }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#22C55E" }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
