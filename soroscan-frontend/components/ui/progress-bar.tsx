"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type ProgressVariant = "success" | "warning" | "danger"
export type ProgressLabelPosition = "above" | "inside"

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indeterminate?: boolean
  variant?: ProgressVariant
  label?: React.ReactNode
  labelPosition?: ProgressLabelPosition
  showPercentage?: boolean
}

const VARIANT_STYLES: Record<
  ProgressVariant,
  { fill: string; track: string }
> = {
  success: {
    fill: "bg-terminal-green shadow-glow-green",
    track: "border-terminal-green/20 bg-terminal-green/5",
  },
  warning: {
    fill: "bg-terminal-warning shadow-[0_0_20px_rgba(255,170,0,0.5)]",
    track: "border-terminal-warning/20 bg-terminal-warning/5",
  },
  danger: {
    fill: "bg-terminal-danger shadow-glow-danger",
    track: "border-terminal-danger/20 bg-terminal-danger/5",
  },
}

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

export function getProgressPercentage(value?: number) {
  return `${clampProgress(value ?? 0)}%`
}

export function ProgressBar({
  value = 0,
  indeterminate = false,
  variant = "success",
  label,
  labelPosition = "above",
  showPercentage = true,
  className,
  ...props
}: ProgressBarProps) {
  const progress = clampProgress(value)
  const styles = VARIANT_STYLES[variant]
  const percentage = getProgressPercentage(progress)
  const labelText = label ?? (showPercentage && !indeterminate ? percentage : null)

  return (
    <div className={cn("w-full space-y-2 font-terminal-mono", className)} {...props}>
      {labelPosition === "above" && labelText ? (
        <div className="flex items-center justify-between gap-3 text-xs tracking-widest text-terminal-gray">
          <span className="uppercase">{label}</span>
          {showPercentage && !indeterminate ? (
            <span className="text-terminal-green tabular-nums">{percentage}</span>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-label={typeof label === "string" ? label : "Progress"}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : 100}
        aria-valuenow={indeterminate ? undefined : progress}
        aria-valuetext={indeterminate ? "Loading" : percentage}
        aria-busy={indeterminate}
        data-indeterminate={indeterminate ? "true" : "false"}
        data-variant={variant}
        data-label-position={labelPosition}
        data-slot="progress-track"
        className={cn(
          "relative h-3 w-full overflow-hidden border",
          "before:absolute before:inset-0 before:content-[''] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]",
          "before:bg-[length:200%_100%] before:opacity-50",
          styles.track,
        )}
      >
        <div
          data-slot="progress-fill"
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-between px-2 text-[10px] text-terminal-black transition-[width,transform] duration-500 ease-out",
            styles.fill,
            indeterminate
              ? "w-2/5 animate-[progress-indeterminate_1.4s_ease-in-out_infinite]"
              : "motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out",
            labelPosition === "inside" ? "text-terminal-black" : "text-transparent",
          )}
          style={indeterminate ? undefined : { width: `${progress}%` }}
        >
          {labelPosition === "inside" ? (
            <>
              {label ? <span className="truncate">{label}</span> : null}
              {showPercentage && !indeterminate ? (
                <span className="ml-auto tabular-nums">{percentage}</span>
              ) : null}
            </>
          ) : null}
        </div>

        {indeterminate ? (
          <span className="sr-only">{labelText ?? "Loading"}</span>
        ) : null}
      </div>
    </div>
  )
}
