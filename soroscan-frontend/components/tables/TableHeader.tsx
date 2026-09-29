import * as React from "react"

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  className?: string
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-terminal-green/10 border-b-terminal border-terminal-green", className)} {...props} />
))

TableHeader.displayName = "TableHeader"

export default TableHeader