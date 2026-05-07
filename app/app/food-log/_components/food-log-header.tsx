"use client"

import { ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FoodLogDayPayload } from "@/lib/queries/food-log-day"
import { cn } from "@/lib/utils"
import {
  relativeDayLabel,
  shiftIso,
  todayIso,
  weekDaysFor,
} from "../_lib/date-utils"
import { MacroSummaryBar } from "./macro-summary-bar"

type Props = {
  selectedDate: string
  onDateChange: (iso: string) => void
  data: FoodLogDayPayload | null
}

export function FoodLogHeader({ selectedDate, onDateChange, data }: Props) {
  const week = weekDaysFor(selectedDate)
  const today = todayIso()
  const isFutureNext = shiftIso(selectedDate, 1) > today

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous day"
            onClick={() => onDateChange(shiftIso(selectedDate, -1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-base font-semibold tabular-nums">
            {relativeDayLabel(selectedDate)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next day"
            disabled={isFutureNext}
            onClick={() => onDateChange(shiftIso(selectedDate, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <div className="size-9" />
      </div>

      <div className="px-2 pb-2">
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => (
            <button
              key={d.iso}
              type="button"
              disabled={d.isFuture}
              onClick={() => onDateChange(d.iso)}
              className={cn(
                "flex flex-col items-center justify-center rounded-full border py-1 text-[10px] leading-tight transition-colors",
                d.isSelected
                  ? "border-foreground bg-muted/40 text-foreground"
                  : "border-border/50 text-muted-foreground",
                d.isFuture && "opacity-30"
              )}
            >
              <span className="font-medium">{d.letter}</span>
              <span className="text-sm font-semibold tabular-nums">
                {d.num}
              </span>
            </button>
          ))}
        </div>
      </div>

      <MacroSummaryBar data={data} />
    </div>
  )
}
