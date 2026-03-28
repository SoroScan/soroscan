"use client"

import * as React from "react"

export function SkeletonText({ width = "100%", height = 12 }: { width?: string | number; height?: number | string }) {
  return (
    <div
      style={{ width, height }}
      className="bg-terminal-gray/10 animate-pulse rounded-sm"
    />
  )
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4 border border-terminal-green/10">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-terminal-gray/10 rounded-sm animate-pulse" />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="flex-1 h-4 bg-terminal-gray/10 rounded-sm animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 160 }: { height?: number }) {
  return <div className="w-full bg-terminal-gray/10 rounded-sm animate-pulse" style={{ height }} />
}

export default Skeletons
