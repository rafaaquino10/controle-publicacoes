"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  error?: string
  label?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-11 rounded-[10px] border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] text-[15px]",
              "placeholder:text-[var(--text-muted)] outline-none transition-all duration-150",
              "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
              icon ? "pl-10 pr-3" : "px-3",
              error && "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[12px] text-[var(--color-error)] m-0">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
export { Input }
export type { InputProps }
