import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  /** Display label */
  label: string
  /** Navigation href — omit for the current (last) page */
  href?: string
}

export interface BreadcrumbProps extends React.ComponentProps<"nav"> {
  items: BreadcrumbItem[]
  /** Separator node rendered between items (default: "/") */
  separator?: React.ReactNode
}

function Breadcrumb({
  items,
  separator = "/",
  className,
  ...props
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className} {...props}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/50 select-none">
                  {separator}
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumb }
