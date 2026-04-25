"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href: string
  isCurrent: boolean
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname()
  const t = useTranslations("Navigation")
  
  // Get all segments and filter out empty ones
  const segments = pathname.split("/").filter(Boolean)
  
  // Check if the first segment is a locale (en or es)
  const locales = ["en", "es"]
  const hasLocale = locales.includes(segments[0])
  
  // Extract path segments excluding the locale
  const pathSegments = hasLocale ? segments.slice(1) : segments
  
  // Construct the breadcrumb items
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: t("home"),
      href: hasLocale ? `/${segments[0]}` : "/",
      isCurrent: pathSegments.length === 0,
    },
    ...pathSegments.map((segment, index) => {
      // Build href segment by segment
      const currentPathSegments = pathSegments.slice(0, index + 1)
      const href = hasLocale 
        ? `/${segments[0]}/${currentPathSegments.join("/")}`
        : `/${currentPathSegments.join("/")}`
      
      const isCurrent = index === pathSegments.length - 1
      
      // Try to get translation, fallback to capitalized segment
      let label = segment
      const knownKeys = ["dashboard", "contracts", "events", "webhooks", "docs", "features", "login"]
      
      if (knownKeys.includes(segment.toLowerCase())) {
        try {
          label = t(segment.toLowerCase())
        } catch {
          label = segment.charAt(0).toUpperCase() + segment.slice(1)
        }
      } else {
        // Handle potential IDs or unknown segments
        if (segment.length > 20) {
          label = `${segment.substring(0, 6)}...${segment.substring(segment.length - 4)}`
        } else {
          label = segment.charAt(0).toUpperCase() + segment.slice(1)
        }
      }

      return {
        label,
        href,
        isCurrent,
      }
    }),
  ]

  return (
    <nav aria-label="Breadcrumb" className={cn("flex py-4 px-1", className)}>
      <ol className="flex items-center flex-wrap gap-2 text-sm text-terminal-gray font-terminal-mono">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mr-2 text-terminal-gray/30 shrink-0" aria-hidden="true" />
            )}
            {item.isCurrent ? (
              <span 
                className="text-terminal-green font-bold tracking-tight" 
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-terminal-green hover:underline underline-offset-4 transition-all duration-200 decoration-terminal-green/30"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
