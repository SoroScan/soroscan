import * as React from "react"

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  className?: string
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto border-terminal border-terminal-green">
    <table ref={ref} className={cn("w-full caption-bottom text-sm font-terminal-mono", className)} {...props} />
  </div>
))

Table.displayName = "Table"

export default Table