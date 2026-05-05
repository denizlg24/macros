import { Skeleton } from "@/components/ui/skeleton"

export default function AddFoodLoading() {
  return (
    <div className="flex flex-col h-dvh">
      {/* Header chips */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <Skeleton className="h-9 flex-1 rounded-full" />
        </div>
        {/* CaloriePill */}
        <Skeleton className="h-9.5 w-24.5 rounded-full" />
        <div className="flex justify-end">
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex items-stretch border-b">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-1 items-center justify-center gap-1.5 py-3"
          >
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-3 w-9" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden px-4 pt-4">
        <Skeleton className="h-5 w-28 mb-3" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex w-full items-center gap-2 border-b border-border/50 py-3"
          >
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-14 h-8 rounded-full shrink-0" />
            <Skeleton className="size-8 rounded-full shrink-0" />
          </div>
        ))}
      </div>

      {/* Bottom search input */}
      <div className="flex items-center gap-2 px-3 py-3">
        <Skeleton className="h-11 flex-1 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full shrink-0" />
      </div>
    </div>
  )
}
