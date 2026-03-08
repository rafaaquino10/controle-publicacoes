import { cn } from "@/lib/cn"

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[10px] bg-[var(--border-color)]",
        className
      )}
    />
  )
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-[var(--surface-card)] rounded-[10px] p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

function SkeletonList({ rows = 5, className }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn("bg-[var(--surface-card)] rounded-[10px] overflow-hidden", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            i < rows - 1 && "border-b border-[var(--border-color)]"
          )}
        >
          <Skeleton className="h-10 w-10 rounded-[8px] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonList }
