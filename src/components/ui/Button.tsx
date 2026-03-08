"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] active:bg-[var(--color-primary-dark)]",
  secondary: "bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--surface-bg)]",
  danger: "bg-[var(--color-error)] text-white hover:opacity-90",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-bg)]",
  outline: "bg-transparent text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5",
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px] rounded-[8px] gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-[10px] gap-2",
  lg: "h-[50px] px-6 text-[16px] rounded-[12px] gap-2",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none",
          "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
export { Button }
export type { ButtonProps }
