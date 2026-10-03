import * as React from "react"

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  className?: string
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 group-hover:text-terminal-green transition-colors", className)} {...props} />
))

TableCell.displayName = "TableCell"

export default TableCell