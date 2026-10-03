import * as React from "react"

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t border-terminal-green bg-terminal-green/5 font-medium", className)} {...props} />
))

TableFooter.displayName = "TableFooter"

export default TableFooter