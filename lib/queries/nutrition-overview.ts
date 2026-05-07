import { and, between, eq } from "drizzle-orm"

import { db } from "@/db/connection"
import {
  dailyNutritionSummaries,
  nutrientTargets,
  nutritionPlans,
  userProfiles,
} from "@/db/schema"
import { nutrientDefinitionsInput } from "@/lib/foods/nutrients"
import { toIsoDate } from "./food-log-day"

export type OverviewRange = "yesterday" | "1w" | "1m" | "3m" | "1y"

export interface NutrientRow {
  key: string
  label: string
  group: string
  unit: string
  sortOrder: number
  consumed: number
  target: number | null
}

export interface NutritionOverviewPayload {
  range: OverviewRange
  startDate: string
  endDate: string
  daysCount: number
  timezone: string
  nutrients: NutrientRow[]
  targets: {
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
  }
}

function rangeBounds(
  range: OverviewRange,
  today: string
): {
  start: string
  end: string
} {
  const end = new Date(`${today}T00:00:00Z`)
  const start = new Date(`${today}T00:00:00Z`)
  if (range === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1)
    end.setUTCDate(end.getUTCDate() - 1)
  } else if (range === "1w") {
    start.setUTCDate(start.getUTCDate() - 6)
  } else if (range === "1m") {
    start.setUTCDate(start.getUTCDate() - 29)
  } else if (range === "3m") {
    start.setUTCDate(start.getUTCDate() - 89)
  } else if (range === "1y") {
    start.setUTCDate(start.getUTCDate() - 364)
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export async function getNutritionOverview(
  userId: string,
  range: OverviewRange
): Promise<NutritionOverviewPayload> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true },
  })
  const timezone = profile?.timezone ?? "UTC"
  const today = toIsoDate(new Date(), timezone)
  const { start, end } = rangeBounds(range, today)

  const plan = await db.query.nutritionPlans.findFirst({
    where: and(
      eq(nutritionPlans.userId, userId),
      eq(nutritionPlans.status, "active")
    ),
    columns: {
      id: true,
      calorieTarget: true,
      proteinTarget: true,
      carbsTarget: true,
      fatTarget: true,
    },
  })

  const [summaryRows, targetRows] = await Promise.all([
    db
      .select({
        nutrients: dailyNutritionSummaries.nutrients,
      })
      .from(dailyNutritionSummaries)
      .where(
        and(
          eq(dailyNutritionSummaries.userId, userId),
          between(dailyNutritionSummaries.logDate, start, end)
        )
      ),
    plan
      ? db
          .select({
            nutrientKey: nutrientTargets.nutrientKey,
            targetValue: nutrientTargets.targetValue,
          })
          .from(nutrientTargets)
          .where(eq(nutrientTargets.planId, plan.id))
      : Promise.resolve([] as { nutrientKey: string; targetValue: string }[]),
  ])

  const totalsByKey: Record<string, number> = {}
  for (const row of summaryRows) {
    if (!row.nutrients || typeof row.nutrients !== "object") continue
    for (const [k, v] of Object.entries(
      row.nutrients as Record<string, unknown>
    )) {
      const num = typeof v === "number" ? v : Number(v)
      if (Number.isFinite(num)) {
        totalsByKey[k] = (totalsByKey[k] ?? 0) + num
      }
    }
  }

  const targetByKey = new Map<string, number>()
  for (const t of targetRows) {
    targetByKey.set(t.nutrientKey, Number(t.targetValue))
  }

  const dayCount = Math.max(1, summaryRows.length)
  const isAggregate = range !== "yesterday"

  const macroTargets = {
    calories: plan?.calorieTarget != null ? Number(plan.calorieTarget) : null,
    protein: plan?.proteinTarget != null ? Number(plan.proteinTarget) : null,
    carbs: plan?.carbsTarget != null ? Number(plan.carbsTarget) : null,
    fat: plan?.fatTarget != null ? Number(plan.fatTarget) : null,
  }

  const nutrients: NutrientRow[] = nutrientDefinitionsInput.map((def) => {
    const total = totalsByKey[def.key] ?? 0
    const consumed = isAggregate ? total / dayCount : total
    let target: number | null = targetByKey.get(def.key) ?? null
    if (def.key === "calories") target = macroTargets.calories
    if (def.key === "protein") target = macroTargets.protein
    if (def.key === "carbs") target = macroTargets.carbs
    if (def.key === "fat") target = macroTargets.fat
    return {
      key: def.key,
      label: def.label,
      group: def.group,
      unit: def.unit,
      sortOrder: def.sortOrder,
      consumed,
      target,
    }
  })

  return {
    range,
    startDate: start,
    endDate: end,
    daysCount: dayCount,
    timezone,
    nutrients,
    targets: macroTargets,
  }
}
