"use client"

import * as React from "react"
import { Button } from "@/components/terminal/Button"

export interface PaginationProps {
  onNext: () => void
  onPrev: () => void
  disabledNext?: boolean
  disabledPrev?: boolean
  page?: number
  showingStart?: number
  showingEnd?: number
  total?: number
  label?: string
}

export function Pagination({
  onNext,
  onPrev,
  disabledNext = false,
  disabledPrev = false,
  page = 1,
  showingStart,
  showingEnd,
  total,
  label,
}: PaginationProps) {
  const summary = label
    ? label
    : typeof showingStart === "number" && typeof showingEnd === "number" && typeof total === "number"
    ? `Showing ${showingStart}-${showingEnd} of ${total}`
    : `Page ${page}`

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={disabledPrev} aria-label="Previous page">
        <span className="font-terminal-mono">&lt;</span>
      </Button>

      <div className="text-xs text-terminal-gray font-terminal-mono">{summary}</div>

      <Button variant="secondary" size="sm" onClick={onNext} disabled={disabledNext} aria-label="Next page">
        <span className="font-terminal-mono">&gt;</span>
      </Button>
    </div>
  )
}

export default Pagination
