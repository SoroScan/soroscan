"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type DeliveryStatus = "success" | "retrying" | "failed"

interface WebhookDeliveryStatusBadgeProps {
  status: DeliveryStatus
  lastDelivery?: string // ISO timestamp
  className?: string
}

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; dotClass: string; textClass: string; animate: boolean }
> = {
  success: {
    label: "SUCCESS",
    dotClass: "bg-terminal-green",
    textClass: "text-terminal-green",
    animate: false,
  },
  retrying: {
    label: "RETRYING",
    dotClass: "bg-terminal-warning",
    textClass: "text-terminal-warning",
    animate: true,
  },
  failed: {
    label: "FAILED",
    dotClass: "bg-terminal-danger",
    textClass: "text-terminal-danger",
    animate: false,
  },
}

function formatDeliveryTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function WebhookDeliveryStatusBadge({
  status,
  lastDelivery,
  className = "",
}: WebhookDeliveryStatusBadgeProps) {
  const { label, dotClass, textClass, animate } = STATUS_CONFIG[status]

  const badge = (
    <span
      role="status"
      aria-label={`Delivery status: ${label}${lastDelivery ? `, last delivery: ${lastDelivery}` : ""}`}
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "border border-current/30 font-terminal-mono text-xs tracking-wider uppercase",
        textClass,
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-block w-2 h-2 rounded-full",
          dotClass,
          animate ? "animate-pulse" : "",
        ].join(" ")}
      />
      {label}
    </span>
  )

  if (!lastDelivery) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-terminal-mono text-xs">
            Last delivery: {formatDeliveryTime(lastDelivery)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
