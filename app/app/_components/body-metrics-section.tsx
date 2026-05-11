import { ChevronRight } from "lucide-react"
import Link from "next/link"
import type { WeightSummary } from "@/lib/weights/contracts"
import { WeightMiniChart } from "./weight-mini-chart"

type Props = {
  weightSummary: WeightSummary
}

export function BodyMetricsSection({ weightSummary }: Props) {
  return (
    <section className="px-5 mt-7">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Body Metrics</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/weight"
          className="rounded-2xl bg-muted/40 p-3 flex min-h-44 flex-col justify-between"
        >
          <div>
            <p className="font-bold text-sm">Scale Weight</p>
            <p className="text-xs text-muted-foreground">Last 7 Entries</p>
          </div>
          <WeightMiniChart points={weightSummary.lastSevenEntries} />
          <div className="border-t border-border/50 pt-2 flex items-center justify-between">
            <p className="text-lg font-semibold tabular-nums">
              {weightSummary.latestWeightKg?.toFixed(1) ?? "--"}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                kg
              </span>
            </p>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </Link>

        {/* <div className="rounded-2xl bg-muted/25 p-3 min-h-44 flex flex-col justify-between opacity-60">
          <div>
            <p className="font-bold text-sm">Progress Photos</p>
            <p className="text-xs text-muted-foreground">Metadata only</p>
          </div>
          <div className="h-16 rounded-xl border border-dashed border-border" />
          <p className="text-sm font-semibold text-muted-foreground">
            Not in scope
          </p>
        </div> */}
      </div>
    </section>
  )
}
