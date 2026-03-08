import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface GroupedListProps {
  header?: string
  footer?: string
  children: ReactNode
  className?: string
}

function GroupedList({ header, footer, children, className }: GroupedListProps) {
  return (
    <div className={cn("", className)}>
      {header && (
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-4 pb-2 m-0">
          {header}
        </p>
      )}
      <div className="bg-[var(--surface-card)] rounded-[10px] overflow-hidden divide-y divide-[var(--border-color)]">
        {children}
      </div>
      {footer && (
        <p className="text-[11px] text-[var(--text-muted)] px-4 pt-1.5 m-0">
          {footer}
        </p>
      )}
    </div>
  )
}

export { GroupedList }
export type { GroupedListProps }
