import * as React from "react"

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  className?: string
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("h-10 px-4 text-left align-middle font-bold text-terminal-cyan uppercase tracking-wider [&:has([role=checkbox])]:pr-0", className)} {...props} />
))

TableHead.displayName = "TableHead"

export default TableHead