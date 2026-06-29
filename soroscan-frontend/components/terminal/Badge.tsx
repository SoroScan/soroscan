import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-terminal-mono font-bold uppercase tracking-wider border",
  {
    variants: {
      variant: {
        default: "border-terminal-green text-terminal-green shadow-glow-green/30",
        cyan: "border-terminal-cyan text-terminal-cyan shadow-glow-cyan/30",
        danger: "border-terminal-danger text-terminal-danger",
        warning: "border-terminal-warning text-terminal-warning",
        muted: "border-terminal-gray text-terminal-gray",
      },
      pulse: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      pulse: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, pulse, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, pulse, className }))}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full bg-current",
          pulse && "animate-pulse"
        )}
      />
      {children}
    </span>
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
