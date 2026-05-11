"use client"

import { format } from "date-fns"
import { ArrowLeft, Pencil, Plus, Scale } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeightOverview } from "@/lib/app-cache/api"
import type { WeightPoint } from "@/lib/weights/contracts"
import { isoToLocalDate } from "@/lib/weights/date-utils"

export function WeightPageClient() {
  const { data, isLoading, isError, refetch } = useWeightOverview()

  if (isLoading || !data) {
    return (
      <div className="min-h-dvh px-5 pt-5 pb-36">
        <Skeleton className="mb-5 h-8 w-40 mx-auto" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-dvh px-5 pt-5 pb-36">
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  const summary = data.summary
  const entriesByMonth = groupEntriesByMonth(data.entries)

  return (
    <div className="min-h-dvh bg-background pb-36">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-5 pb-2">
        <Button asChild type="button" variant="ghost" size="icon">
          <Link href="/app" aria-label="Back to dashboard">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-center text-xl font-medium">Scale Weight</h1>
        <Button asChild type="button" variant="ghost" size="icon">
          <Link href="/app/weigh-in?log=today" aria-label="Add weigh-in">
            <Plus className="size-6" />
          </Link>
        </Button>
      </header>

      <section className="px-5 pt-4">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-5">
          <div>
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="mt-1 text-4xl font-light tabular-nums">
              {summary.weekAverageKg?.toFixed(1) ?? "--"}{" "}
              <span className="text-base text-muted-foreground">kg</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {weekRangeLabel(data.today)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Difference</p>
            <p className="mt-1 text-4xl font-light tabular-nums">
              {summary.weekDifferenceKg?.toFixed(1) ?? "--"}{" "}
              <span className="text-base text-muted-foreground">kg</span>
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Scale className="size-6 text-primary" />
          </div>
        </div>

        <WeightChart points={summary.weekPoints} />

        <div className="mt-5 flex items-center gap-3">
          <div className="grid flex-1 grid-cols-6 rounded-full bg-muted p-1 text-sm">
            {["1W", "1M", "3M", "6M", "1Y", "All"].map((range, index) => (
              <button
                key={range}
                type="button"
                className={`h-10 rounded-full ${
                  index === 0 ? "bg-foreground text-background" : ""
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="h-12 rounded-full bg-muted px-5 text-sm"
          >
            D
          </button>
        </div>
      </section>

      <section className="mt-7 border-t bg-background px-5 pt-6">
        <div className="mb-7 rounded-xl bg-muted/40 py-5 text-center font-medium">
          <span className="inline-flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            Scale Weight
          </span>
        </div>

        {entriesByMonth.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-5 text-sm text-muted-foreground">
            No weigh-ins yet.
          </div>
        ) : (
          entriesByMonth.map((group) => (
            <div key={group.label} className="mb-8">
              <h2 className="mb-4 text-2xl font-bold">{group.label}</h2>
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 rounded-2xl bg-muted/40 p-4"
                  >
                    <div className="flex size-12 items-center justify-center rounded-lg bg-background">
                      <Scale className="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-medium tabular-nums">
                        {entry.weightKg.toFixed(1)} kg
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(isoToLocalDate(entry.logDate), "EEE, d MMM")}
                      </p>
                    </div>
                    <Button asChild type="button" variant="ghost" size="icon">
                      <Link
                        href={`/app/weigh-in?log=${entry.logDate}`}
                        aria-label="Edit weigh-in"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="mt-10 flex h-64 items-center justify-center text-sm text-muted-foreground">
        Add at least two weigh-ins to draw the graph.
      </div>
    )
  }

  const values = points.map((point) => point.weightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 0.5)
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? 8 : 8 + (index / (points.length - 1)) * 84
    const y = 75 - ((point.weightKg - min) / range) * 45
    return { x, y }
  })
  const path = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ")

  return (
    <div className="mt-8 h-72">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        {[30, 52, 75].map((y) => (
          <line
            key={y}
            x1="0"
            x2="92"
            y1={y}
            y2={y}
            className="stroke-border"
            strokeDasharray="2 2"
            strokeWidth="0.5"
          />
        ))}
        <path
          d={path}
          fill="none"
          className="stroke-primary"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        {coords.map((coord, index) => (
          <circle
            key={points[index].date}
            cx={coord.x}
            cy={coord.y}
            r="1.8"
            className="fill-background stroke-primary"
            strokeWidth="1.2"
          />
        ))}
        <text x="94" y="31" className="fill-muted-foreground text-[4px]">
          {max.toFixed(1)}
        </text>
        <text x="94" y="76" className="fill-muted-foreground text-[4px]">
          {min.toFixed(1)}
        </text>
      </svg>
      <div className="grid grid-cols-7 text-center text-sm text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </div>
  )
}

function weekRangeLabel(today: string): string {
  const end = isoToLocalDate(today)
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`
}

function groupEntriesByMonth(
  entries: {
    id: string
    logDate: string
    weightKg: number
  }[]
) {
  const groups = new Map<string, typeof entries>()
  for (const entry of entries) {
    const label = format(isoToLocalDate(entry.logDate), "MMMM yyyy")
    groups.set(label, [...(groups.get(label) ?? []), entry])
  }
  return Array.from(groups, ([label, groupEntries]) => ({
    label,
    entries: groupEntries,
  }))
}
