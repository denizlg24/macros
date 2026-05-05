import { Skeleton } from "@/components/ui/skeleton"

export default function ScanLoading() {
  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <Skeleton className="w-full aspect-square max-w-72 rounded-2xl" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Bottom action */}
      <div className="px-5 pb-8">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}
