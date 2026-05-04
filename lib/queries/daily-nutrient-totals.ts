import { and, eq, sql } from "drizzle-orm"

import { db } from "@/db/connection"
import {
  foodLogEntries,
  foodLogEntryNutrients,
  userProfiles,
} from "@/db/schema"

function toIsoDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date)
}

export async function getDailyNutrientTotals(
  userId: string
): Promise<Record<string, number>> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true },
  })
  const timezone = profile?.timezone ?? "UTC"
  const today = toIsoDate(new Date(), timezone)

  const rows = await db
    .select({
      nutrientKey: foodLogEntryNutrients.nutrientKey,
      total: sql<string>`sum(${foodLogEntryNutrients.amount})`,
    })
    .from(foodLogEntries)
    .innerJoin(
      foodLogEntryNutrients,
      eq(foodLogEntryNutrients.entryId, foodLogEntries.id)
    )
    .where(
      and(eq(foodLogEntries.userId, userId), eq(foodLogEntries.logDate, today))
    )
    .groupBy(foodLogEntryNutrients.nutrientKey)

  return Object.fromEntries(rows.map((r) => [r.nutrientKey, Number(r.total)]))
}
