import { type HTMLAttributes } from "react"
import { cn } from "@/lib/cn"

type BadgeVariant = "red" | "amber" | "green" | "blue" | "slate" | "primary"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  red: "bg-[#fef2f2] text-[#ff3b30] dark:bg-[#450a0a] dark:text-[#ff453a]",
  amber: "bg-[#fffbeb] text-[#ff9500] dark:bg-[#451a03] dark:text-[#ff9f0a]",
  green: "bg-[#f0fdf4] text-[#34c759] dark:bg-[#052e16] dark:text-[#30d158]",
  blue: "bg-[#eff6ff] text-[#007aff] dark:bg-[#172554] dark:text-[#64d2ff]",
  slate: "bg-[var(--surface-bg)] text-[var(--text-secondary)]",
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
}

function Badge({ className, variant = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeProps }
