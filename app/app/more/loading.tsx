import { Skeleton } from "@/components/ui/skeleton"

export default function MoreLoading() {
  return (
    <div className="min-h-screen pb-36 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-8 w-20 mt-1" />
      </div>

      {/* Profile section */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-3 py-3">
          <Skeleton className="size-12 rounded-full shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Settings rows */}
      <div className="px-5 space-y-px">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 border-b border-border/50"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="size-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
