import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen pb-36 overflow-y-auto">
      {/* Page header */}
      <div className="px-5 pt-6 pb-4">
        <Skeleton className="h-3 w-44 mb-2" />
        <Skeleton className="h-8 w-40 mt-1" />
      </div>

      {/* Section label */}
      <div className="px-5 mb-2">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Nutrition section */}
      <div className="flex items-center px-4 gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="w-44 shrink-0 flex justify-center">
          <Skeleton className="size-40 rounded-full" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Macro bars */}
      <div className="grid grid-cols-3 gap-4 px-5 mt-4">
        {[10, 8, 12].map((w, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex justify-center gap-2 mt-4 px-5">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <div className="h-px bg-border mx-5 mt-6" />

      {/* Insights section */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Goal Progress card */}
          <div className="rounded-2xl border p-3 flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-full rounded-full mt-1" />
            <div className="flex items-center justify-between mt-1">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="size-4 rounded" />
            </div>
          </div>
          {/* Energy Balance card */}
          <div className="rounded-2xl border p-3 flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <div className="flex items-end gap-0.5 h-10 mt-1">
              {[55, 38, 75, 48, 68, 42, 60].map((h, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="size-4 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
