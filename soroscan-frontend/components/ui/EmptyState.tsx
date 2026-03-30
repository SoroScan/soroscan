import * as React from "react"
import { LucideIcon, Search, AlertTriangle, FileQuestion } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/terminal/Card"
import { Button } from "@/components/terminal/Button"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: "no-data" | "error" | "no-results"
  className?: string
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  variant = "no-data",
  className,
}: EmptyStateProps) => {
  // Map variant to default icons if none provided
  const DefaultIcon = Icon || {
    "no-data": FileQuestion,
    "error": AlertTriangle,
    "no-results": Search,
  }[variant]

  return (
    <Card className={cn("flex flex-col items-center justify-center text-center p-8 min-h-[300px]", className)}>
      <div className="flex flex-col items-center max-w-[420px] space-y-4">
        <div className={cn(
          "p-4 border-2 border-dashed rounded-full mb-2",
          variant === "error" ? "border-terminal-danger text-terminal-danger" : 
          variant === "no-results" ? "border-terminal-cyan text-terminal-cyan" : 
          "border-terminal-green text-terminal-green"
        )}>
          <DefaultIcon size={48} strokeWidth={1.5} />
        </div>
        
        <div className="space-y-2">
          <h3 className={cn(
            "text-xl font-bold uppercase tracking-wider",
            variant === "error" ? "text-terminal-danger" : 
            variant === "no-results" ? "text-terminal-cyan" : 
            "text-terminal-green"
          )}>
            {title}
          </h3>
          <p className="text-sm text-terminal-green/70 leading-relaxed">
            {description}
          </p>
        </div>

        {action && (
          <div className="pt-4">
            <Button 
              variant={variant === "error" ? "danger" : variant === "no-results" ? "secondary" : "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export { EmptyState }
