"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

interface GroupedRowProps {
  icon?: ReactNode
  iconBg?: string
  label: string
  value?: ReactNode
  chevron?: boolean
  destructive?: boolean
  href?: string
  onClick?: () => void
  className?: string
}

function GroupedRow({
  icon,
  iconBg,
  label,
  value,
  chevron = false,
  destructive = false,
  href,
  onClick,
  className,
}: GroupedRowProps) {
  const content = (
    <>
      {icon && (
        <span
          className={cn(
            "flex items-center justify-center w-[30px] h-[30px] rounded-[7px] flex-shrink-0 text-white",
            iconBg || "bg-[var(--color-primary)]"
          )}
        >
          {icon}
        </span>
      )}
      <span
        className={cn(
          "flex-1 text-[15px] min-w-0 truncate",
          destructive ? "text-[var(--color-error)] font-medium" : "text-[var(--text-primary)]"
        )}
      >
        {label}
      </span>
      {value && (
        <span className="text-[15px] text-[var(--text-muted)] flex-shrink-0">
          {value}
        </span>
      )}
      {(chevron || href) && (
        <ChevronRight size={16} className="text-[var(--text-muted)] flex-shrink-0 ml-1" />
      )}
    </>
  )

  const baseClass = cn(
    "flex items-center gap-3 min-h-[44px] px-4 py-2.5 no-underline transition-colors duration-100",
    (href || onClick) && "active:bg-[var(--surface-bg)] cursor-pointer",
    className
  )

  if (href) {
    return <Link href={href} className={baseClass}>{content}</Link>
  }

  if (onClick) {
    return <button onClick={onClick} className={cn(baseClass, "w-full border-none bg-transparent text-left")}>{content}</button>
  }

  return <div className={baseClass}>{content}</div>
}

export { GroupedRow }
export type { GroupedRowProps }
