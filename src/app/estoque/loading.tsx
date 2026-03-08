import { Skeleton, SkeletonList } from "@/components/ui"

export default function StockLoading() {
  return (
    <div className="flex flex-col gap-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-[8px]" />
          <Skeleton className="h-9 w-16 rounded-[8px]" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-[10px]" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>
      <SkeletonList rows={8} />
    </div>
  )
}
