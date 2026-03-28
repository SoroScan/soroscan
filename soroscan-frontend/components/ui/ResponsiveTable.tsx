"use client"

import * as React from "react"

export interface ResponsiveTableProps {
  table: React.ReactNode
  cards: React.ReactNode
}

export function ResponsiveTable({ table, cards }: ResponsiveTableProps) {
  return (
    <>
      <div className="hidden md:block">{table}</div>
      <div className="md:hidden">{cards}</div>
    </>
  )
}

export default ResponsiveTable
