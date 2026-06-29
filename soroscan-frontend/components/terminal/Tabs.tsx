import * as React from "react"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
}

export interface TerminalTabsProps {
  tabs: Tab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  children?: React.ReactNode
  className?: string
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}) => {
  const [active, setActive] = React.useState(activeTab ?? tabs[0]?.id)

  const handleSelect = (id: string) => {
    setActive(id)
    onTabChange?.(id)
  }

  return (
    <div className={cn("font-terminal-mono", className)}>
      {/* Tab bar */}
      <div className="flex border-b border-terminal-green/40 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              "px-4 py-2 text-xs uppercase tracking-wider border-r border-terminal-green/20 transition-colors whitespace-nowrap",
              active === tab.id
                ? "bg-terminal-green text-terminal-black font-bold"
                : "text-terminal-gray hover:text-terminal-green hover:bg-terminal-green/10"
            )}
          >
            {active === tab.id && "▶ "}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active content */}
      <div className="p-4 text-terminal-green text-sm">{children}</div>
    </div>
  )
}

export { TerminalTabs }
