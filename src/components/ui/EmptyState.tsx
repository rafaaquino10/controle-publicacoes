import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center gap-3", className)}>
      <div className="w-16 h-16 rounded-full bg-[var(--surface-bg)] flex items-center justify-center text-[var(--text-muted)]">
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold text-[var(--text-primary)] m-0">{title}</h3>
      {description && (
        <p className="text-[14px] text-[var(--text-muted)] m-0 max-w-[280px]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
