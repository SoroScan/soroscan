import * as React from "react"
import { cn } from "@/lib/utils"

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  language?: string
  filename?: string
  code: string
}

const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ className, language, filename, code, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = () => {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }

    return (
      <div
        ref={ref}
        className={cn(
          "border border-terminal-green/50 bg-terminal-black font-terminal-mono text-sm",
          className
        )}
        {...props}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between bg-terminal-green/10 border-b border-terminal-green/30 px-4 py-2">
          <div className="flex items-center gap-3">
            {filename && (
              <span className="text-terminal-cyan text-xs">{filename}</span>
            )}
            {language && (
              <span className="text-terminal-gray text-xs uppercase tracking-wider">
                {language}
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="text-xs text-terminal-green hover:text-terminal-cyan transition-colors px-2 py-0.5 border border-terminal-green/30 hover:border-terminal-cyan"
            aria-label="Copy code"
          >
            {copied ? "[COPIED]" : "[COPY]"}
          </button>
        </div>

        {/* Code content */}
        <div className="overflow-x-auto">
          <pre className="p-4 text-terminal-green leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    )
  }
)
CodeBlock.displayName = "CodeBlock"

export { CodeBlock }
