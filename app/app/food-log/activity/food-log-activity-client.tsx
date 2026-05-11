"use client"

import { useQuery } from "@tanstack/react-query"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { foodLogQueryKeys } from "@/lib/app-cache/food-log-keys"
import type {
  FoodLogActivityDay,
  FoodLogActivityOverview,
  FoodLogDayStatus,
} from "@/lib/food-logging/activity"
import { CalorieDayPill } from "../_components/calorie-day-pill"

async function fetchActivity(
  signal?: AbortSignal
): Promise<FoodLogActivityOverview> {
  const response = await fetch("/api/food-log/activity", {
    cache: "no-store",
    signal,
  })
  if (!response.ok)
    throw new Error(`Failed to load activity (${response.status})`)
  const body = (await response.json()) as {
    activity: FoodLogActivityOverview
  }
  return body.activity
}

export function FoodLogActivityClient() {
  const { data, error, isError, isLoading, refetch } = useQuery({
    queryKey: foodLogQueryKeys.activity,
    queryFn: ({ signal }) => fetchActivity(signal),
    staleTime: 60_000,
  })

  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date())
  )

  if (isLoading || !data) {
    return <ActivityLoading />
  }

  if (isError) {
    return (
      <div className="min-h-dvh px-5 pt-5 pb-36">
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {error instanceof Error ? error.message : "Try again"}
        </Button>
      </div>
    )
  }

  const dayByDate = new Map(data.days.map((day) => [day.date, day]))
  const todayDay = dayByDate.get(data.today)
  const currentStreak = getCurrentStreak(data.days, data.today)

  return (
    <div className="min-h-dvh bg-background pb-36">
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pt-5 pb-3">
        <Button asChild type="button" variant="ghost" size="icon">
          <Link href="/app" aria-label="Back to dashboard">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-center text-xl font-bold">Food Logging</h1>
        <span className="size-9" />
      </header>

      <main>
        <section className="grid grid-cols-2 px-5 py-5">
          <BigStat
            label="Today"
            suffix="kcal"
            value={Math.round(todayDay?.calories ?? 0).toLocaleString()}
          />
          <BigStat
            label="Streak"
            suffix={currentStreak === 1 ? "day" : "days"}
            value={currentStreak.toLocaleString()}
          />
        </section>

        <MonthOverview
          calorieTarget={data.calorieTarget}
          dayByDate={dayByDate}
          today={data.today}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
        />

        <Legend />

        <FoodLogHistoryCarousel days={data.days} />
      </main>
    </div>
  )
}

function ActivityLoading() {
  return (
    <div className="min-h-dvh px-5 pt-5 pb-36">
      <Skeleton className="mx-auto mb-8 h-8 w-44" />
      <div className="grid grid-cols-2 gap-8 pb-8">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-[440px] w-full rounded-2xl" />
    </div>
  )
}

function BigStat({
  label,
  suffix,
  value,
}: {
  label: string
  suffix: string
  value: string
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-light leading-none tabular-nums">
          {value}
        </span>
        <span className="text-base text-muted-foreground">{suffix}</span>
      </p>
    </div>
  )
}

function MonthOverview({
  calorieTarget,
  dayByDate,
  onMonthChange,
  today,
  visibleMonth,
}: {
  calorieTarget: number | null
  dayByDate: Map<string, FoodLogActivityDay>
  onMonthChange: (date: Date) => void
  today: string
  visibleMonth: Date
}) {
  const days = useMemo(() => buildCalendarMonth(visibleMonth), [visibleMonth])
  const todayDate = isoToDate(today)

  return (
    <section className="px-4">
      <div className="grid grid-cols-7 gap-3">
        {days.map((date) => {
          const iso = dateToIso(date)
          const activityDay = dayByDate.get(iso)
          const isFuture = iso > today || isAfter(date, todayDate)
          return (
            <CalorieDayPill
              key={iso}
              ariaLabel={`${format(date, "PPPP")}: ${
                activityDay?.status ?? "empty"
              }`}
              consumed={activityDay?.calories ?? 0}
              date={date}
              href={`/app/food-log?date=${iso}`}
              iso={iso}
              isDimmed={!isSameMonth(date, visibleMonth)}
              isDisabled={isFuture}
              isPartial={activityDay?.status === "partial"}
              showWeekday={false}
              strokeColor="var(--primary)"
              target={calorieTarget}
            />
          )
        })}
      </div>

      <div className="mt-5 grid grid-cols-7 gap-x-2 text-center text-sm text-primary">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[auto_1fr_auto] gap-3">
        <div className="flex rounded-full bg-muted">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full"
            onClick={() =>
              onMonthChange(startOfMonth(subMonths(visibleMonth, 1)))
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full"
            onClick={() =>
              onMonthChange(startOfMonth(addMonths(visibleMonth, 1)))
            }
            aria-label="Next month"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-muted px-4 text-sm font-medium"
        >
          {format(visibleMonth, "MMMM")}
          <ChevronDown className="size-4 text-primary" />
        </button>

        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-muted px-4 text-sm font-medium"
        >
          {format(visibleMonth, "yyyy")}
          <ChevronDown className="size-4 text-primary" />
        </button>
      </div>
    </section>
  )
}

function Legend() {
  return (
    <section className="mt-6 border-t bg-background px-5 py-5">
      <div className="grid grid-cols-3 items-center gap-2 rounded-xl bg-muted/40 px-4 py-4 text-sm">
        <LegendDot status="full" label="Tracked" />
        <LegendDot status="partial" label="Partial" />
        <LegendDot status="empty" label="Untracked" />
      </div>
    </section>
  )
}

function LegendDot({
  label,
  status,
}: {
  label: string
  status: FoodLogDayStatus
}) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className={legendDotClass(status)} />
      <span className="truncate">{label}</span>
    </span>
  )
}

function FoodLogHistoryCarousel({ days }: { days: FoodLogActivityDay[] }) {
  const trackedYears = Array.from(
    new Set(
      days
        .filter((day) => day.status !== "empty")
        .map((day) => Number(day.date.slice(0, 4)))
    )
  ).sort((a, b) => b - a)
  const dayByDate = new Map(days.map((day) => [day.date, day]))

  if (trackedYears.length === 0) return null

  return (
    <section className="pb-8">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
        {trackedYears.map((year) => (
          <FoodLogYearHeatmap key={year} dayByDate={dayByDate} year={year} />
        ))}
      </div>
    </section>
  )
}

function FoodLogYearHeatmap({
  dayByDate,
  year,
}: {
  dayByDate: Map<string, FoodLogActivityDay>
  year: number
}) {
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = new Date(year, monthIndex, 1)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    return {
      label: format(month, "MMM"),
      days: Array.from({ length: daysInMonth }, (_, dayIndex) =>
        dateToIso(new Date(year, monthIndex, dayIndex + 1))
      ),
    }
  })

  return (
    <article className="min-w-full snap-center">
      <h2 className="mb-3 text-2xl font-bold">{year}</h2>
      <div className="rounded-xl bg-muted/40 p-2">
        <div className="grid grid-cols-12 gap-1">
          {months.map((month) => (
            <div key={month.label} className="flex min-w-0 flex-col gap-2">
              <div className="grid grid-cols-4 gap-[3px]">
                {month.days.map((date) => (
                  <span
                    key={date}
                    className={heatmapCellClass(dayByDate.get(date)?.status)}
                  />
                ))}
                {Array.from({ length: 32 - month.days.length }, (_, index) => (
                  <span
                    key={`${month.label}-empty-${index}`}
                    className="aspect-square opacity-0"
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {month.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function buildCalendarMonth(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days: Date[] = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    days.push(date)
  }
  return days
}

function getCurrentStreak(days: FoodLogActivityDay[], today: string) {
  const dayByDate = new Map(days.map((day) => [day.date, day]))
  let streak = 0
  for (let iso = today; ; iso = dateToIso(addDays(isoToDate(iso), -1))) {
    const day = dayByDate.get(iso)
    if (!day || day.status === "empty") break
    streak += 1
  }
  return streak
}

function legendDotClass(status: FoodLogDayStatus) {
  const base = "block size-5 rounded-full"
  if (status === "full") return `${base} border-[3px] border-primary`
  if (status === "partial")
    return `${base} border-[3px] border-dashed border-primary`
  return `${base} border-[3px] border-muted-foreground/35`
}

function heatmapCellClass(status: FoodLogDayStatus | undefined) {
  const base = "aspect-square"
  if (status === "full") return `${base} bg-primary`
  if (status === "partial")
    return `${base} border border-dashed border-primary bg-primary/15`
  return `${base} bg-muted-foreground/15`
}

function isoToDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function dateToIso(date: Date) {
  return format(date, "yyyy-MM-dd")
}
