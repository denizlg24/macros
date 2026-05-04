import { and, eq, sql } from "drizzle-orm"
import { db } from "@/db/connection"
import {
  foodLogEntries,
  foodLogEntryNutrients,
  nutritionPlans,
  userProfiles,
} from "@/db/schema"

export type CaloriePreference = "consumed" | "remaining"

export type DailyCalorieSummary = {
  today: string
  timezone: string
  consumed: number
  target: number | null
  preference: CaloriePreference
}

function toIsoDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date)
}

export async function getDailyCalorieSummary(
  userId: string
): Promise<DailyCalorieSummary> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true, caloriePreference: true },
  })
  const timezone = profile?.timezone ?? "UTC"
  const preference: CaloriePreference = profile?.caloriePreference ?? "consumed"
  const today = toIsoDate(new Date(), timezone)

  const [consumedRows, plan] = await Promise.all([
    db
      .select({
        calories: sql<string>`coalesce(sum(${foodLogEntryNutrients.amount}) filter (where ${foodLogEntryNutrients.nutrientKey} = 'calories'), 0)`,
      })
      .from(foodLogEntries)
      .innerJoin(
        foodLogEntryNutrients,
        eq(foodLogEntryNutrients.entryId, foodLogEntries.id)
      )
      .where(
        and(
          eq(foodLogEntries.userId, userId),
          eq(foodLogEntries.logDate, today)
        )
      ),
    db.query.nutritionPlans.findFirst({
      where: and(
        eq(nutritionPlans.userId, userId),
        eq(nutritionPlans.status, "active")
      ),
      columns: { calorieTarget: true },
    }),
  ])

  const consumedRow = consumedRows[0]

  return {
    today,
    timezone,
    consumed: consumedRow ? Number(consumedRow.calories) : 0,
    target: plan?.calorieTarget != null ? Number(plan.calorieTarget) : null,
    preference,
  }
}
