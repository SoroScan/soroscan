import * as React from "react"

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  className?: string
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b border-terminal-green/30 transition-colors hover:bg-terminal-green/10 hover:shadow-glow-green/20 group cursor-default", className)} {...props} />
))

TableRow.displayName = "TableRow"

export default TableRow