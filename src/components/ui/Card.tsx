import { type HTMLAttributes } from "react"
import { cn } from "@/lib/cn"

type CardVariant = "elevated" | "grouped" | "interactive"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  elevated: "bg-[var(--surface-card)] rounded-[10px] shadow-sm border border-[var(--border-color)]",
  grouped: "bg-[var(--surface-card)] rounded-[10px] overflow-hidden",
  interactive: [
    "bg-[var(--surface-card)] rounded-[10px] shadow-sm border border-[var(--border-color)]",
    "transition-all duration-150 cursor-pointer",
    "hover:shadow-md hover:border-[color-mix(in_srgb,var(--color-primary)_25%,var(--border-color))]",
    "active:scale-[0.98]",
  ].join(" "),
}

function Card({ className, variant = "elevated", ...props }: CardProps) {
  return (
    <div
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  )
}

export { Card }
export type { CardProps }
