"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useHydrated } from "@/hooks/use-hydrated"
import { foodLogQueryKeys } from "@/lib/app-cache/food-log-keys"
import type {
  NutritionOverviewPayload,
  OverviewRange,
} from "@/lib/queries/nutrition-overview"
import { cn } from "@/lib/utils"

const TABS: { value: OverviewRange; label: string }[] = [
  { value: "yesterday", label: "Yesterday" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "1y", label: "1 Year" },
]

const SECTIONS: {
  title: string
  keys: string[]
  barColor: string
  bigCard?: boolean
}[] = [
  {
    title: "Calories",
    keys: ["calories"],
    barColor: "bg-blue-500",
    bigCard: true,
  },
  {
    title: "Macros",
    keys: ["protein", "fat", "carbs"],
    barColor: "bg-orange-500",
    bigCard: true,
  },
  {
    title: "Carb Breakdown",
    keys: ["fiber", "sugar", "addedSugar"],
    barColor: "bg-green-500",
    bigCard: true,
  },
  {
    title: "Fat Breakdown",
    keys: [
      "saturated",
      "monoUnsaturated",
      "polyUnsaturated",
      "omega3",
      "omega3Ala",
      "omega3Dha",
      "omega3Epa",
      "omega6",
      "transFat",
      "cholesterol",
    ],
    barColor: "bg-yellow-500",
    bigCard: true,
  },
  {
    title: "Vitamins",
    keys: [
      "a",
      "b1",
      "b2",
      "b3",
      "b5",
      "b6",
      "b12",
      "c",
      "d",
      "e",
      "k",
      "folate",
    ],
    barColor: "bg-purple-500",
    bigCard: false,
  },
  {
    title: "Minerals",
    keys: [
      "calcium",
      "copper",
      "iron",
      "magnesium",
      "manganese",
      "phosphorus",
      "potassium",
      "selenium",
      "sodium",
      "zinc",
    ],
    barColor: "bg-cyan-500",
    bigCard: false,
  },
  {
    title: "Other",
    keys: ["water", "alcohol", "caffeine", "choline"],
    barColor: "bg-muted-foreground",
    bigCard: false,
  },
]

function macroBarColor(key: string, fallback: string): string {
  if (key === "calories") return "bg-blue-500"
  if (key === "protein") return "bg-orange-500"
  if (key === "fat") return "bg-yellow-500"
  if (key === "carbs") return "bg-green-500"
  if (key === "fiber") return "bg-green-500"
  return fallback
}

async function fetchOverview(
  range: OverviewRange,
  signal?: AbortSignal
): Promise<NutritionOverviewPayload> {
  const res = await fetch(`/api/food-log/overview?range=${range}`, {
    signal,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to load overview (${res.status})`)
  return res.json() as Promise<NutritionOverviewPayload>
}

export function NutritionOverviewClient() {
  const hydrated = useHydrated()
  const [range, setRange] = useState<OverviewRange>("yesterday")
  const { data, isLoading, isError } = useQuery({
    queryKey: foodLogQueryKeys.overview(range),
    queryFn: ({ signal }) => fetchOverview(range, signal),
    enabled: hydrated,
  })

  return (
    <div className="min-h-dvh pb-32">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          <Link
            href="/app/food-log"
            aria-label="Back"
            className="inline-flex items-center justify-center size-9 rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="flex-1 text-center text-lg font-semibold pr-9">
            Nutrition Overview
          </h1>
        </div>

        <div className="px-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-4 px-2 pb-2 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setRange(t.value)}
                className={cn(
                  "py-2 text-sm border-b-2 -mb-px",
                  range === t.value
                    ? "border-foreground font-semibold"
                    : "border-transparent text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hydrated || isLoading ? (
        <OverviewLoading />
      ) : isError || !data ? (
        <p className="px-4 pt-8 text-sm text-destructive">
          Could not load overview.
        </p>
      ) : (
        <OverviewBody data={data} />
      )}
    </div>
  )
}

function OverviewLoading() {
  return (
    <div className="px-4 pt-6 space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-6 w-32 mb-3" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

function OverviewBody({ data }: { data: NutritionOverviewPayload }) {
  const map = new Map(data.nutrients.map((n) => [n.key, n]))
  const isAggregate = data.range !== "yesterday"

  return (
    <div className="px-4 pt-6 space-y-8">
      {SECTIONS.map((section) => {
        const rows = section.keys
          .map((k) => map.get(k))
          .filter((n): n is NonNullable<typeof n> => Boolean(n))
        if (rows.length === 0) return null

        return (
          <section key={section.title}>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              {section.title}
              {isAggregate ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  daily avg
                </span>
              ) : null}
            </h2>
            <div className="space-y-2">
              {rows.map((row) => (
                <NutrientRow
                  key={row.key}
                  row={row}
                  bigCard={section.bigCard ?? false}
                  fallbackColor={macroBarColor(row.key, section.barColor)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function NutrientRow({
  row,
  bigCard,
  fallbackColor,
}: {
  row: NutritionOverviewPayload["nutrients"][number]
  bigCard: boolean
  fallbackColor: string
}) {
  const consumed = row.consumed
  const target = row.target
  const pct =
    target != null && target > 0 ? Math.round((consumed / target) * 100) : null
  const fillPct =
    target != null && target > 0
      ? Math.min(100, Math.round((consumed / target) * 100))
      : 0

  if (bigCard) {
    return (
      <div className="rounded-xl bg-muted/40 px-4 py-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <span className="text-base font-semibold">{row.label}</span>
          <span className="text-sm tabular-nums">
            {formatValue(consumed, row.unit)}
            {target != null
              ? ` / ${formatValue(target, row.unit)} ${row.unit}`
              : ` ${row.unit}`}
          </span>
          <span className="text-sm tabular-nums text-muted-foreground min-w-[3.5rem] text-right">
            {pct != null ? `${pct}%` : "No Target"}
          </span>
        </div>
        {target != null ? (
          <div className="h-2 rounded-full bg-muted overflow-hidden relative">
            <div
              className={cn("h-full rounded-full", fallbackColor)}
              style={{ width: `${fillPct}%` }}
            />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/30" />
          </div>
        ) : (
          <div className="h-2 rounded-full bg-muted/60" />
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-muted/40 px-4 py-3 flex items-center justify-between gap-2">
      <span className="text-sm font-medium">{row.label}</span>
      <span className="text-sm tabular-nums">
        {formatValue(consumed, row.unit)}
        {target != null ? ` / ${formatValue(target, row.unit)}` : ""} {row.unit}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground min-w-[3.5rem] text-right">
        {pct != null ? `${pct}%` : "No Target"}
      </span>
    </div>
  )
}

function formatValue(n: number, unit: string): string {
  if (unit === "kcal") return `${Math.round(n)}`
  if (n >= 100) return `${Math.round(n)}`
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(1).replace(/\.0$/, "")
}
