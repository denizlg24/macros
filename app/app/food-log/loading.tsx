import { Skeleton } from "@/components/ui/skeleton"

export default function FoodLogLoading() {
  return (
    <div className="min-h-screen pb-36 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-8 w-36 mt-1" />
      </div>

      <div className="px-5 space-y-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border/50 py-3"
          >
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
