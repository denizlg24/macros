import { Skeleton } from "@/components/ui/skeleton"

export default function StrategyLoading() {
  return (
    <div className="min-h-screen pb-36 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-8 w-40 mt-1" />
      </div>

      <div className="px-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border p-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-8 w-24 rounded-full mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
