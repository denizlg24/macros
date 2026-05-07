"use client"

import { format } from "date-fns"
import { Flame, Pencil, Plus, Utensils } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import type {
  FoodLogDayPayload,
  FoodLogEntry,
} from "@/lib/queries/food-log-day"
import { cn } from "@/lib/utils"

type Props = {
  data: FoodLogDayPayload
  onDeleteEntry: (entryId: string) => void
}

type HourBucket = {
  hour: number
  label: string
  totals: { calories: number; protein: number; fat: number; carbs: number }
  entries: FoodLogEntry[]
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function entryHour(e: FoodLogEntry): number {
  if (!e.eatenAt) return 12
  return new Date(e.eatenAt).getHours()
}

function entryTimeLabel(e: FoodLogEntry): string {
  if (!e.eatenAt) return ""
  return format(new Date(e.eatenAt), "h:mm")
}

export function Timeline({ data, onDeleteEntry }: Props) {
  const buckets = useMemo<HourBucket[]>(() => {
    const map = new Map<number, FoodLogEntry[]>()
    for (const e of data.entries) {
      const h = entryHour(e)
      const arr = map.get(h) ?? []
      arr.push(e)
      map.set(h, arr)
    }
    return Array.from({ length: 24 }, (_, hour) => {
      const entries = map.get(hour) ?? []
      const totals = entries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          protein: acc.protein + e.protein,
          fat: acc.fat + e.fat,
          carbs: acc.carbs + e.carbs,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      )
      return { hour, label: hourLabel(hour), totals, entries }
    })
  }, [data.entries])

  const visibleStart = useMemo(() => {
    const firstWithEntry = buckets.findIndex((b) => b.entries.length > 0)
    return firstWithEntry === -1 ? 7 : Math.max(0, firstWithEntry - 1)
  }, [buckets])

  const visibleEnd = useMemo(() => {
    let last = -1
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[i].entries.length > 0) {
        last = i
        break
      }
    }
    return last === -1 ? 22 : Math.min(23, last + 1)
  }, [buckets])

  const visibleBuckets = buckets.slice(visibleStart, visibleEnd + 1)

  return (
    <div className="relative px-3 pt-2 pb-6">
      <div className="absolute left-[3.25rem] top-2 bottom-6 w-px bg-border" />
      {visibleBuckets.map((b) => (
        <HourRow
          key={b.hour}
          bucket={b}
          date={data.date}
          onDeleteEntry={onDeleteEntry}
        />
      ))}
    </div>
  )
}

function HourRow({
  bucket,
  date,
  onDeleteEntry,
}: {
  bucket: HourBucket
  date: string
  onDeleteEntry: (entryId: string) => void
}) {
  const hasEntries = bucket.entries.length > 0

  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center min-w-12 px-2 h-6 rounded-full bg-muted/60 text-xs text-muted-foreground tabular-nums">
            {bucket.label}
          </span>
          <Link
            href={`/app/add?focus=search&date=${date}&hour=${bucket.hour}`}
            aria-label={`Add food at ${bucket.label}`}
            className="inline-flex items-center justify-center size-6 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>
        {hasEntries ? (
          <div className="ml-auto flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
            <MacroPill
              value={bucket.totals.calories}
              suffix={<Flame className="size-3" />}
            />
            <MacroPill
              value={bucket.totals.protein}
              suffix={<span className="text-[10px] font-semibold">P</span>}
            />
            <MacroPill
              value={bucket.totals.fat}
              suffix={<span className="text-[10px] font-semibold">F</span>}
            />
            <MacroPill
              value={bucket.totals.carbs}
              suffix={<span className="text-[10px] font-semibold">C</span>}
            />
          </div>
        ) : null}
      </div>

      {bucket.entries.map((e) => (
        <EntryCard key={e.id} entry={e} onDelete={onDeleteEntry} />
      ))}
    </div>
  )
}

function MacroPill({
  value,
  suffix,
}: {
  value: number
  suffix: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{Math.round(value)}</span>
      <span className="inline-flex items-center justify-center size-4 rounded-full bg-muted/60">
        {suffix}
      </span>
    </span>
  )
}

function EntryCard({
  entry,
  onDelete,
}: {
  entry: FoodLogEntry
  onDelete: (id: string) => void
}) {
  const time = entryTimeLabel(entry)
  const grams =
    entry.servingUnit.toLowerCase().includes("g") &&
    !entry.servingUnit.toLowerCase().includes("kg")
      ? `${Math.round(entry.servingQuantity * entry.servingsConsumed)} g`
      : `${formatNumber(entry.servingsConsumed)} ${entry.servingLabel ?? entry.servingUnit}`

  return (
    <div className="relative pl-14 pr-1 pb-2">
      {time ? (
        <span className="absolute left-0 top-3 text-[10px] tabular-nums text-muted-foreground w-12 text-right pr-1">
          {time}
        </span>
      ) : null}
      <div className="rounded-xl bg-muted/40 px-3 py-2.5 flex items-center gap-3">
        <div
          className={cn(
            "shrink-0 inline-flex items-center justify-center size-9 rounded-md bg-muted text-teal-500"
          )}
        >
          <Utensils className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {entry.foodName}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            <span className="font-semibold">{Math.round(entry.calories)}</span>
            <Flame className="inline size-3 -mt-0.5 ml-0.5 mr-2 text-blue-500" />
            <span className="font-semibold">{Math.round(entry.protein)}</span>
            <span className="font-semibold text-orange-500">P </span>
            <span className="font-semibold">{Math.round(entry.fat)}</span>
            <span className="font-semibold text-yellow-500">F </span>
            <span className="font-semibold">{Math.round(entry.carbs)}</span>
            <span className="font-semibold text-green-500">C </span>
            <span className="text-muted-foreground"> • {grams}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete entry"
          onClick={() => onDelete(entry.id)}
          className="shrink-0 size-8 rounded-full bg-muted hover:bg-destructive/10"
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}
