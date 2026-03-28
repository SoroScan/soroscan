"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

export function Breadcrumbs() {
  const pathname = usePathname() || "/"
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="text-sm font-terminal-mono text-terminal-gray">
      <ol className="flex items-center gap-2">
        {/* First segment always visible */}
        <li>
          <Link href="/" className="text-terminal-cyan hover:text-terminal-green">
            HOME
          </Link>
        </li>
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1
          const href = "/" + segments.slice(0, idx + 1).join("/")
          // collapse middle segments on small screens
          const showOnMd = idx > 0 && idx < segments.length - 1 ? "hidden md:inline" : ""
          return (
            <li key={idx} className={`flex items-center gap-2 ${showOnMd}`}>
              <span className="text-terminal-green">&gt;</span>
              {isLast ? (
                <span className="text-terminal-gray">{decodeURIComponent(seg)}</span>
              ) : (
                <Link href={href} className="text-terminal-cyan hover:text-terminal-green">
                  {decodeURIComponent(seg)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
