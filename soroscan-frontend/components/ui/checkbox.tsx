"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * If true, the checkbox will be set to an indeterminate state.
   */
  indeterminate?: boolean;
  /**
   * Optional label to display to the right of the checkbox.
   */
  label?: React.ReactNode;
  /**
   * Optional class name for the label element.
   */
  labelClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, label, labelClassName, disabled, id, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)
    const resolvedRef = (ref as React.MutableRefObject<HTMLInputElement>) || internalRef
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    React.useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate === true
      }
    }, [resolvedRef, indeterminate])

    const checkboxControl = (
      <div className={cn("relative flex h-4 w-4 shrink-0 items-center justify-center", className)}>
        <input
          type="checkbox"
          id={checkboxId}
          ref={resolvedRef}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : props.checked !== undefined ? props.checked : undefined}
          aria-label={typeof label === 'string' ? label : props['aria-label']}
          className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed z-10"
          {...props}
        />
        {/* Background & Border Layer */}
        <div className={cn(
          "pointer-events-none absolute inset-0 rounded-sm border border-primary shadow-sm ring-offset-background transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          indeterminate ? "bg-primary text-primary-foreground" : "peer-checked:bg-primary peer-checked:text-primary-foreground"
        )} />
        
        {/* Icons Layer */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground z-20">
          {indeterminate ? (
            <Minus className="h-3 w-3" strokeWidth={3} data-testid="minus-icon" />
          ) : (
            <Check className="h-3 w-3 hidden peer-checked:block" strokeWidth={3} data-testid="check-icon" />
          )}
        </div>
      </div>
    );

    if (!label) {
      return checkboxControl;
    }

    return (
      <div className="flex items-center space-x-2">
        {checkboxControl}
        <label
          htmlFor={checkboxId}
          className={cn(
            "text-sm font-medium leading-none cursor-pointer select-none",
            disabled && "cursor-not-allowed opacity-50",
            labelClassName
          )}
        >
          {label}
        </label>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
