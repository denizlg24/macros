"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addDays,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeightOverview } from "@/lib/app-cache/api"
import { queryKeys } from "@/lib/app-cache/query-keys"
import type { UpsertWeighInBody, WeighInItem } from "@/lib/weights/contracts"
import { dateToIso, isoToLocalDate } from "@/lib/weights/date-utils"
import { BigStat } from "../_components/big-stat"
import { PageHeader } from "../_components/page-header"
import { YearHeatmapCarousel } from "../_components/year-heatmap"

async function saveWeighIn(body: UpsertWeighInBody): Promise<WeighInItem> {
  const response = await fetch("/api/weight/weigh-ins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Save failed (${response.status})`)
  const data = (await response.json()) as { entry: WeighInItem }
  return data.entry
}

async function deleteWeighIn(id: string): Promise<void> {
  const response = await fetch(`/api/weight/weigh-ins/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) throw new Error(`Delete failed (${response.status})`)
}

export function WeighInPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useWeightOverview()
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date())
  )
  const [draftWeight, setDraftWeight] = useState("")
  const logParam = searchParams.get("log")
  const selectedDate =
    logParam === "today"
      ? data?.today
      : logParam && /^\d{4}-\d{2}-\d{2}$/.test(logParam)
        ? logParam
        : null

  const saveMutation = useMutation({
    mutationFn: saveWeighIn,
    onSuccess: async () => {
      setDraftWeight("")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.weightOverview }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
      router.replace("/app/weigh-in")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWeighIn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.weightOverview }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ])
      router.replace("/app/weigh-in")
    },
  })

  const entryByDate = useMemo(
    () => new Map(data?.entries.map((entry) => [entry.logDate, entry]) ?? []),
    [data?.entries]
  )
  const activeEntry = selectedDate ? entryByDate.get(selectedDate) : null
  const weightValue = draftWeight || (activeEntry?.weightKg.toString() ?? "")

  function openLogger(date: string) {
    setDraftWeight("")
    router.push(`/app/weigh-in?log=${date}`)
  }

  function closeLogger() {
    setDraftWeight("")
    router.replace("/app/weigh-in")
  }

  function submit() {
    if (!selectedDate) return
    const normalized = weightValue.replace(",", ".")
    const weightKg = Number(normalized)
    if (!Number.isFinite(weightKg) || weightKg <= 0) return
    saveMutation.mutate({ logDate: selectedDate, weightKg })
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

  if (isLoading || !data) {
    return (
      <div className="min-h-dvh px-5 pt-5 pb-36">
        <Skeleton className="mb-6 h-8 w-36 mx-auto" />
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  const days = monthGrid(visibleMonth)
  const trackedDates = new Set(data.entries.map((entry) => entry.logDate))
  const todayEntry = entryByDate.get(data.today)
  const trackedYears = Array.from(
    new Set(data.entries.map((entry) => Number(entry.logDate.slice(0, 4))))
  ).sort((a, b) => b - a)

  return (
    <div className="min-h-dvh bg-background pb-36">
      <PageHeader title="Weigh-In" backLabel="Back to dashboard" />

      <section className="grid grid-cols-2 px-5 py-5">
        <BigStat
          label="Today"
          value={todayEntry ? todayEntry.weightKg.toFixed(1) : "--"}
          suffix="kg"
        />
        <BigStat
          label="Streak"
          value={data.summary.streakDays.toString()}
          suffix={data.summary.streakDays === 1 ? "day" : "days"}
        />
      </section>

      <section className="px-4">
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const iso = dateToIso(day)
            const isFuture = iso > data.today
            const isCurrentMonth = isSameMonth(day, visibleMonth)
            const tracked = trackedDates.has(iso)
            const selected = selectedDate === iso
            return (
              <button
                key={iso}
                type="button"
                disabled={isFuture}
                onClick={() => openLogger(iso)}
                className={`relative aspect-square rounded-full border text-base tabular-nums transition-colors ${
                  selected
                    ? "border-primary text-foreground"
                    : "border-muted-foreground/25"
                } ${
                  isCurrentMonth && !isFuture
                    ? "text-foreground"
                    : "text-muted-foreground/35"
                }`}
              >
                {format(day, "d")}
                {tracked ? (
                  <span className="absolute bottom-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr_auto] gap-3">
          <div className="flex rounded-full bg-muted">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setVisibleMonth(subMonths(visibleMonth, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setVisibleMonth(addDays(endOfMonth(visibleMonth), 1))
              }
              aria-label="Next month"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
          <div className="flex items-center justify-center rounded-full bg-muted px-4 text-sm">
            {format(visibleMonth, "MMMM")}
          </div>
          <div className="flex items-center justify-center rounded-full bg-muted px-4 text-sm">
            {format(visibleMonth, "yyyy")}
          </div>
        </div>
      </section>

      <section className="mt-6 border-t bg-background px-5 py-6">
        <div className="rounded-2xl bg-muted/40 p-5 flex justify-center gap-10">
          <span className="flex items-center gap-2">
            <span className="size-4 rounded-full border-2 border-primary" />
            Tracked
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="size-4 rounded-full border-2 border-muted-foreground/40" />
            Untracked
          </span>
        </div>
      </section>

      <YearHeatmapCarousel
        years={trackedYears}
        getCellClass={(iso) =>
          trackedDates.has(iso) ? "bg-primary" : "bg-muted-foreground/15"
        }
      />

      {selectedDate ? (
        <div
          className="fixed inset-0 z-30 bg-black/70"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close weigh-in form"
            onClick={closeLogger}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t bg-popover p-3 pb-safe-end text-popover-foreground">
            <div className="mx-auto mb-3 h-1 w-14 rounded-full bg-muted-foreground/30" />
            <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={closeLogger}
              >
                <X className="size-6" />
              </Button>
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums">
                  {format(isoToLocalDate(selectedDate), "dd/MM/yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">Scale Weight</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                disabled={!activeEntry || deleteMutation.isPending}
                onClick={() =>
                  activeEntry && deleteMutation.mutate(activeEntry.id)
                }
              >
                <Trash2 className="size-5" />
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_0.5fr] gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Weight</span>
                <div className="relative">
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={weightValue}
                    onChange={(event) => setDraftWeight(event.target.value)}
                    className="h-12 rounded-xl border-2 pr-11 text-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base">
                    kg
                  </span>
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold">Body Fat</span>
                <div className="relative">
                  <Input disabled className="h-12 rounded-xl pr-8" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base">
                    %
                  </span>
                </div>
              </label>
            </div>
            <Button
              type="button"
              className="mt-4 h-12 w-full rounded-xl text-base"
              disabled={saveMutation.isPending || !weightValue}
              onClick={submit}
            >
              Save
            </Button>
            <NumberPad value={weightValue} onChange={setDraftWeight} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function monthGrid(month: Date): Date[] {
  const start = startOfMonth(month)
  const mondayOffset = (getDay(start) + 6) % 7
  const first = addDays(start, -mondayOffset)
  return Array.from({ length: 42 }, (_, index) => addDays(first, index))
}

function NumberPad({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"]
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="h-11 rounded-xl bg-muted text-xl"
          onClick={() => {
            if (key === "⌫") onChange(value.slice(0, -1))
            else if (
              key === "," &&
              !value.includes(",") &&
              !value.includes(".")
            )
              onChange(`${value},`)
            else if (key !== ",") onChange(`${value}${key}`)
          }}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
