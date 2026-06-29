import * as React from "react"
import { cn } from "@/lib/utils"

export interface TerminalWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  status?: "online" | "offline" | "processing"
}

const statusColors = {
  online: "bg-terminal-green shadow-glow-green/50",
  offline: "bg-terminal-danger",
  processing: "bg-terminal-warning animate-pulse",
}

const TerminalWindow = React.forwardRef<HTMLDivElement, TerminalWindowProps>(
  ({ className, title = "TERMINAL", status = "online", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "border border-terminal-green bg-terminal-black font-terminal-mono overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between bg-terminal-green/15 border-b border-terminal-green px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Traffic-light dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-terminal-danger/70" />
            <div className="w-3 h-3 rounded-full bg-terminal-warning/70" />
            <div className="w-3 h-3 rounded-full bg-terminal-green/70" />
          </div>
          <span className="text-xs text-terminal-green font-bold tracking-widest">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
          <span className="text-xs text-terminal-gray uppercase">{status}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 text-terminal-green text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
)
TerminalWindow.displayName = "TerminalWindow"

export { TerminalWindow }
