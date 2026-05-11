import { ChevronRight } from "lucide-react"
import Link from "next/link"
import type { FoodLoggingSummary } from "@/lib/food-logging/activity"
import type { WeightSummary } from "@/lib/weights/contracts"

type Props = {
  foodLoggingSummary: FoodLoggingSummary
  weightSummary: WeightSummary
}

export function HabitsSection({ foodLoggingSummary, weightSummary }: Props) {
  const trackedSet = new Set(weightSummary.trackedLast30Days)

  return (
    <section className="px-5 mt-7">
      <h2 className="mb-4 text-lg font-bold">Habits</h2>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/weigh-in"
          className="rounded-2xl bg-muted/40 p-3 flex min-h-36 flex-col justify-between"
        >
          <div>
            <p className="font-bold text-sm">Weigh-In</p>
            <p className="text-xs text-muted-foreground">Last 30 Days</p>
          </div>
          <div className="grid grid-cols-10 gap-1 py-2" aria-hidden="true">
            {weightSummary.last30Days.map((date) => {
              const tracked = trackedSet.has(date)
              return (
                <span
                  key={date}
                  className={`aspect-square ${
                    tracked ? "bg-primary" : "bg-muted-foreground/15"
                  }`}
                />
              )
            })}
          </div>
          <div className="border-t border-border/50 pt-2 flex items-center justify-between">
            <p className="text-sm font-semibold tabular-nums">
              {weightSummary.weighInsThisWeek}/7{" "}
              <span className="text-xs font-medium text-muted-foreground">
                this week
              </span>
            </p>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </Link>

        <Link
          href="/app/food-log/activity"
          className="rounded-2xl bg-muted/40 p-3 min-h-36 flex flex-col justify-between"
        >
          <p className="font-bold text-sm">Food Logging</p>
          <p className="text-xs text-muted-foreground">Last 30 Days</p>
          <div className="grid grid-cols-10 gap-1 py-2" aria-hidden="true">
            {foodLoggingSummary.last30Days.map((day) => (
              <span
                key={day.date}
                className={`aspect-square ${
                  day.status === "full"
                    ? "bg-primary"
                    : day.status === "partial"
                      ? "border border-dashed border-primary bg-primary/15"
                      : "bg-muted-foreground/15"
                }`}
              />
            ))}
          </div>
          <div className="border-t border-border/50 pt-2 flex items-center justify-between">
            <p className="text-sm font-semibold tabular-nums">
              {foodLoggingSummary.fullThisWeek}/7{" "}
              <span className="text-xs font-medium text-muted-foreground">
                this week
              </span>
            </p>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </section>
  )
}
