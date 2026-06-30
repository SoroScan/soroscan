import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-terminal-mono ring-offset-terminal-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative group overflow-hidden",
  {
    variants: {
      variant: {
        primary:
          "bg-transparent border-terminal border-terminal-green text-terminal-green hover:shadow-glow-green hover:bg-terminal-green/10",
        secondary:
          "bg-transparent border-terminal border-terminal-cyan text-terminal-cyan hover:shadow-glow-cyan hover:bg-terminal-cyan/10",
        danger:
          "bg-transparent border-terminal border-terminal-danger text-terminal-danger hover:shadow-glow-danger hover:bg-terminal-danger/10",
      },
      size: {
        // min-h-[44px] enforces WCAG 2.5.5 / Apple HIG 44pt tap target on
        // mobile; manual sizes above 44 are preserved on sm+ breakpoints.
        default: "min-h-[44px] px-4 py-2 md:min-h-[40px]",
        sm: "min-h-[44px] px-3 md:min-h-[36px]",
        lg: "min-h-[44px] px-8 md:min-h-[44px]",
        icon: "min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            &gt;
          </span>
          {children}
        </span>
        {/* Subtle scanline effect on hover */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-transparent -translate-y-full group-hover:animate-[scan_2s_linear_infinite] pointer-events-none opacity-20" />
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
