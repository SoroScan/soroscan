import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Dropdown } from "./dropdown"

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  ...props
}: PaginationProps) {
  // Page number generation logic
  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis1", totalPages]
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "ellipsis1",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ]
    }

    return [
      1,
      "ellipsis1",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis2",
      totalPages,
    ]
  }

  const pages = getPages()

  const dropdownOptions = pageSizeOptions.map((size) => ({
    label: `${size} / page`,
    value: size.toString(),
  }))

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex flex-wrap items-center gap-4", className)}
      {...props}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 px-2">
          {pages.map((page, i) => {
            if (page === "ellipsis1" || page === "ellipsis2") {
              return (
                <span
                  key={`ellipsis-${i}`}
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More pages</span>
                </span>
              )
            }

            const pageNumber = page as number
            const isActive = pageNumber === currentPage

            return (
              <Button
                key={pageNumber}
                variant={isActive ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(pageNumber)}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  isActive ? `Page ${pageNumber}` : `Go to page ${pageNumber}`
                }
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {pageSize && onPageSizeChange && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground w-32">
          <Dropdown
            options={dropdownOptions}
            value={pageSize.toString()}
            onChange={(val) => onPageSizeChange(parseInt(val, 10))}
            aria-label="Select page size"
          />
        </div>
      )}
    </nav>
  )
}
