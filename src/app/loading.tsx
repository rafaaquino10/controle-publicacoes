import { Skeleton, SkeletonList } from "@/components/ui"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 animate-in">
      {/* Greeting skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Quick actions skeleton */}
      <div>
        <Skeleton className="h-3 w-24 mb-2.5" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface-card)] rounded-[10px] flex flex-col items-center justify-center gap-2 py-5 px-3 min-h-[100px]">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity skeleton */}
      <div>
        <Skeleton className="h-3 w-32 mb-2.5" />
        <SkeletonList rows={5} />
      </div>
    </div>
  )
}
