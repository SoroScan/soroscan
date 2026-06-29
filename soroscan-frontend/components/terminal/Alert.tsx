import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative border-l-4 bg-terminal-black p-4 font-terminal-mono text-sm",
  {
    variants: {
      variant: {
        info: "border-terminal-cyan text-terminal-cyan",
        success: "border-terminal-green text-terminal-green",
        warning: "border-terminal-warning text-terminal-warning",
        error: "border-terminal-danger text-terminal-danger",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const prefixMap = {
  info: "[INFO]",
  success: "[OK]",
  warning: "[WARN]",
  error: "[ERR]",
} as const

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    >
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">
          {prefixMap[variant ?? "info"]}
        </span>
        <div>
          {title && <div className="font-bold mb-1">{title}</div>}
          <div className="opacity-90">{children}</div>
        </div>
      </div>
    </div>
  )
)
Alert.displayName = "Alert"

export { Alert, alertVariants }
