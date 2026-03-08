"use client"

import { forwardRef, type SelectHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full h-11 rounded-[10px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] text-[15px]",
            "px-3 outline-none cursor-pointer transition-all duration-150",
            "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
            error && "border-[var(--color-error)]",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-[12px] text-[var(--color-error)] m-0">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"
export { Select }
export type { SelectProps }
