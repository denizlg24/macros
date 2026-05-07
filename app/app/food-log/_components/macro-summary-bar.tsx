"use client"

import { Flame } from "lucide-react"
import type { FoodLogDayPayload } from "@/lib/queries/food-log-day"
import { cn } from "@/lib/utils"

type Macro = {
  key: "calories" | "protein" | "fat" | "carbs"
  letter: string
  color: string
}

const MACROS: Macro[] = [
  { key: "calories", letter: "", color: "bg-blue-500" },
  { key: "protein", letter: "P", color: "bg-orange-500" },
  { key: "fat", letter: "F", color: "bg-yellow-500" },
  { key: "carbs", letter: "C", color: "bg-green-500" },
]

function fmt(n: number): string {
  return Math.round(n).toLocaleString()
}

export function MacroSummaryBar({ data }: { data: FoodLogDayPayload | null }) {
  return (
    <div className="px-3 pb-3">
      <div className="flex items-stretch gap-2">
        {MACROS.map((m) => {
          const consumed = data?.totals[m.key] ?? 0
          const target = data?.targets[m.key] ?? null
          const pct =
            target && target > 0
              ? Math.min(100, Math.round((consumed / target) * 100))
              : 0
          return (
            <div key={m.key} className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1 text-xs tabular-nums">
                {m.key === "calories" ? (
                  <Flame className="size-3.5 text-blue-500 shrink-0" />
                ) : (
                  <span className="font-bold text-[11px] shrink-0">
                    {m.letter}
                  </span>
                )}
                <span className="truncate">
                  {fmt(consumed)}
                  {target != null ? ` / ${fmt(target)}` : ""}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full", m.color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
