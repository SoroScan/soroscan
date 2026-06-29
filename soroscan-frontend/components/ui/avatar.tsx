import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 group",
  {
    variants: {
      size: {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-14 h-14 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

/** Deterministic hue from a string so each user gets a consistent colour. */
function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 50%)`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  /** Image URL — falls back to initials if omitted or load fails */
  src?: string
  /** Full name used for initials and tooltip */
  name: string
  /** Override background color for the initials fallback */
  color?: string
}

function Avatar({ src, name, size, color, className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const showImage = !!src && !imgError
  const initials = getInitials(name)
  const bgColor = color ?? colorFromName(name)

  return (
    <div
      className={cn(avatarVariants({ size }), className)}
      title={name}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full font-semibold text-white select-none"
          style={{ backgroundColor: bgColor }}
          aria-label={initials}
        >
          {initials}
        </span>
      )}

      {/* Hover tooltip */}
      <span
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
          bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap shadow-md
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-150 z-10
        "
        role="tooltip"
        aria-hidden="true"
      >
        {name}
      </span>
    </div>
  )
}

export { Avatar, avatarVariants }
