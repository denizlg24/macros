import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm"

import { db } from "@/db/connection"
import {
  dailyNutritionSummaries,
  foodLogEntries,
  foodLogEntryNutrients,
  foodNutrientValues,
  foodNutritionSnapshots,
  foods,
  nutrientDefinitions,
  userProfiles,
} from "@/db/schema"
import type {
  ExternalFoodNutrition,
  ExternalFoodSummary,
  FoodHistoryItem,
  FoodSearchItem,
  LogFoodInput,
  LogFoodResult,
} from "@/lib/foods/contracts"
import {
  type NutrientKey,
  nutrientDefinitionsInput,
} from "@/lib/foods/nutrients"
import {
  getNutritionFoodNutrition,
  getNutritionFoodSummary,
} from "@/lib/foods/source"

const snapshotDriftTolerance = 0.0001
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function toNumericString(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : "0"
}

function numberOrNull(value: number | null | undefined) {
  return value ?? null
}

export function toFoodSearchItem(summary: ExternalFoodSummary): FoodSearchItem {
  return {
    id: summary.id,
    barcode: summary.barcode ?? null,
    name: summary.name,
    brand: summary.brand ?? null,
    servingLabel: summary.servingLabel ?? null,
    caloriesPerServing: numberOrNull(summary.caloriesPerServing),
    proteinPerServing: numberOrNull(summary.proteinPerServing),
    carbsPerServing: numberOrNull(summary.carbsPerServing),
    fatPerServing: numberOrNull(summary.fatPerServing),
    sourceUpdatedAt: summary.updatedAt ?? null,
    rank: numberOrNull(summary.rank),
    score: numberOrNull(summary.score),
  }
}

function toIsoDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date)
}

function getHourInTimezone(date: Date, timezone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(date)
  )
}

function inferMealType(hour: number) {
  if (hour >= 5 && hour < 11) {
    return "breakfast"
  }
  if (hour >= 11 && hour < 16) {
    return "lunch"
  }
  if (hour >= 17 && hour < 22) {
    return "dinner"
  }
  return "snack"
}

function hourDistance(left: number, right: number) {
  const distance = Math.abs(left - right)
  return Math.min(distance, 24 - distance)
}

async function getUserTimezone(userId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true },
  })
  return profile?.timezone ?? "UTC"
}

async function ensureNutrientDefinitionRows() {
  await db
    .insert(nutrientDefinitions)
    .values(nutrientDefinitionsInput)
    .onConflictDoUpdate({
      target: nutrientDefinitions.key,
      set: {
        label: sql`excluded.label`,
        group: sql`excluded.group`,
        unit: sql`excluded.unit`,
        sortOrder: sql`excluded."sortOrder"`,
      },
    })
}

async function upsertExternalFood(summary: ExternalFoodSummary) {
  const now = new Date()
  const [upserted] = await db
    .insert(foods)
    .values({
      source: "deniz_nutrition",
      externalItemId: summary.id,
      barcode: summary.barcode ?? null,
      name: summary.name,
      brand: summary.brand ?? null,
    })
    .onConflictDoUpdate({
      target: [foods.source, foods.externalItemId],
      targetWhere: sql`${foods.externalItemId} is not null`,
      set: {
        barcode: summary.barcode ?? null,
        name: summary.name,
        brand: summary.brand ?? null,
        updatedAt: now,
      },
    })
    .returning({ id: foods.id })

  if (!upserted) {
    throw new Error("Failed to upsert external food")
  }

  return upserted.id
}

async function getLatestSnapshot(foodId: string) {
  return db.query.foodNutritionSnapshots.findFirst({
    where: eq(foodNutritionSnapshots.foodId, foodId),
    orderBy: desc(foodNutritionSnapshots.fetchedAt),
    with: {
      nutrients: {
        columns: { nutrientKey: true, amount: true },
      },
    },
  })
}

function nutrientsHaveDrifted(
  latest: Awaited<ReturnType<typeof getLatestSnapshot>>,
  nutrition: ExternalFoodNutrition
) {
  if (!latest) {
    return true
  }

  if (
    latest.servingLabel !== nutrition.servingLabel ||
    latest.servingUnit !== nutrition.servingUnit ||
    Math.abs(Number(latest.servingQuantity) - nutrition.servingQuantity) >
      snapshotDriftTolerance
  ) {
    return true
  }

  const latestNutrients = new Map(
    latest.nutrients.map((row) => [row.nutrientKey, Number(row.amount)])
  )

  const currentNutrients = Object.entries(nutrition.nutrients)

  if (latestNutrients.size !== currentNutrients.length) {
    return true
  }

  for (const [key, amount] of currentNutrients) {
    const latestAmount = latestNutrients.get(key)

    if (
      latestAmount == null ||
      Math.abs(latestAmount - amount) > snapshotDriftTolerance
    ) {
      return true
    }
  }

  return false
}

async function createFoodSnapshot(
  foodId: string,
  summary: ExternalFoodSummary,
  nutrition: ExternalFoodNutrition
) {
  await ensureNutrientDefinitionRows()

  const [snapshot] = await db
    .insert(foodNutritionSnapshots)
    .values({
      foodId,
      sourceItemId: summary.id,
      servingLabel: nutrition.servingLabel,
      servingQuantity: toNumericString(nutrition.servingQuantity),
      servingUnit: nutrition.servingUnit,
      rawSummary: summary,
      rawNutrition: nutrition,
    })
    .returning({ id: foodNutritionSnapshots.id })

  const nutrientRows = Object.entries(nutrition.nutrients).map(
    ([nutrientKey, amount]) => ({
      snapshotId: snapshot.id,
      nutrientKey: nutrientKey as NutrientKey,
      amount: toNumericString(amount),
    })
  )

  if (nutrientRows.length > 0) {
    await db.insert(foodNutrientValues).values(nutrientRows)
  }

  return snapshot.id
}

export async function ensureExternalFoodSnapshot(
  sourceItemId: string,
  preSummary?: ExternalFoodSummary
) {
  const [summary, nutrition] = await Promise.all([
    preSummary || getNutritionFoodSummary(sourceItemId),
    getNutritionFoodNutrition(sourceItemId),
  ])
  const foodId = await upsertExternalFood(summary)
  const latestSnapshot = await getLatestSnapshot(foodId)

  if (latestSnapshot && !nutrientsHaveDrifted(latestSnapshot, nutrition)) {
    return {
      foodId,
      snapshotId: latestSnapshot.id,
      summary,
      nutrition,
      createdSnapshot: false,
    }
  }

  return {
    foodId,
    snapshotId: await createFoodSnapshot(foodId, summary, nutrition),
    summary,
    nutrition,
    createdSnapshot: true,
  }
}

export async function getFoodHistory(
  userId: string,
  atHour: number | undefined,
  limit: number
): Promise<FoodHistoryItem[]> {
  const timezone = await getUserTimezone(userId)
  const referenceHour = atHour ?? getHourInTimezone(new Date(), timezone)
  const rows = await db
    .select({
      localFoodId: foods.id,
      sourceItemId: foods.externalItemId,
      barcode: foods.barcode,
      entryId: foodLogEntries.id,
      foodName: foodLogEntries.foodName,
      brand: foodLogEntries.brand,
      servingLabel: foodLogEntries.servingLabel,
      servingQuantity: foodLogEntries.servingQuantity,
      servingUnit: foodLogEntries.servingUnit,
      servingsConsumed: foodLogEntries.servingsConsumed,
      logDate: foodLogEntries.logDate,
      eatenAt: foodLogEntries.eatenAt,
      mealType: foodLogEntries.mealType,
    })
    .from(foodLogEntries)
    .innerJoin(foods, eq(foods.id, foodLogEntries.foodId))
    .where(
      and(
        eq(foodLogEntries.userId, userId),
        eq(foodLogEntries.entryType, "food"),
        eq(foods.source, "deniz_nutrition"),
        isNotNull(foods.externalItemId)
      )
    )
    .orderBy(desc(foodLogEntries.eatenAt))
    .limit(Math.min(limit * 8, 200))

  const latestByFood = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    if (row.sourceItemId && !latestByFood.has(row.sourceItemId)) {
      latestByFood.set(row.sourceItemId, row)
    }
  }

  const orderedRows = [...latestByFood.values()]
    .sort((left, right) => {
      const leftHour = left.eatenAt
        ? getHourInTimezone(left.eatenAt, timezone)
        : referenceHour
      const rightHour = right.eatenAt
        ? getHourInTimezone(right.eatenAt, timezone)
        : referenceHour
      const leftDistance = hourDistance(leftHour, referenceHour)
      const rightDistance = hourDistance(rightHour, referenceHour)

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      return (right.eatenAt?.getTime() ?? 0) - (left.eatenAt?.getTime() ?? 0)
    })
    .slice(0, limit)

  const nutrientRows =
    orderedRows.length > 0
      ? await db
          .select({
            entryId: foodLogEntryNutrients.entryId,
            nutrientKey: foodLogEntryNutrients.nutrientKey,
            amount: foodLogEntryNutrients.amount,
          })
          .from(foodLogEntryNutrients)
          .where(
            inArray(
              foodLogEntryNutrients.entryId,
              orderedRows.map((row) => row.entryId)
            )
          )
      : []

  const nutrientsByEntry = new Map<string, Record<string, number>>()
  for (const row of nutrientRows) {
    const nutrients = nutrientsByEntry.get(row.entryId) ?? {}
    nutrients[row.nutrientKey] = Number(row.amount)
    nutrientsByEntry.set(row.entryId, nutrients)
  }

  return orderedRows.map((row) => {
    const servingsConsumed = Number(row.servingsConsumed)
    const perServingScale = servingsConsumed > 0 ? servingsConsumed : 1
    const nutrients = nutrientsByEntry.get(row.entryId) ?? {}

    return {
      id: row.sourceItemId ?? row.localFoodId,
      localFoodId: row.localFoodId,
      lastLogEntryId: row.entryId,
      barcode: row.barcode,
      name: row.foodName,
      brand: row.brand,
      servingLabel: row.servingLabel,
      caloriesPerServing:
        nutrients["calories"] == null
          ? null
          : nutrients["calories"] / perServingScale,
      proteinPerServing:
        nutrients["protein"] == null
          ? null
          : nutrients["protein"] / perServingScale,
      carbsPerServing:
        nutrients["carbs"] == null
          ? null
          : nutrients["carbs"] / perServingScale,
      fatPerServing:
        nutrients["fat"] == null ? null : nutrients["fat"] / perServingScale,
      sourceUpdatedAt: null,
      rank: null,
      score: null,
      lastLoggedAt: row.eatenAt?.toISOString() ?? null,
      lastLogDate: row.logDate,
      lastMealType: row.mealType,
      lastServingsConsumed: servingsConsumed,
      lastServingQuantity: Number(row.servingQuantity),
      lastServingUnit: row.servingUnit,
      lastServingLabel: row.servingLabel,
    }
  })
}

async function refreshDailyNutritionSummary(
  tx: DbTransaction,
  userId: string,
  logDate: string
) {
  await tx.execute(sql`
    insert into ${dailyNutritionSummaries} (
      "userId",
      "logDate",
      "nutrients",
      "calories",
      "protein",
      "carbs",
      "fat",
      "updatedAt"
    )
    select
      ${userId},
      ${logDate},
      coalesce(jsonb_object_agg(nutrient_totals."nutrientKey", nutrient_totals.amount), '{}'::jsonb),
      coalesce(max(nutrient_totals.amount) filter (where nutrient_totals."nutrientKey" = 'calories'), 0),
      coalesce(max(nutrient_totals.amount) filter (where nutrient_totals."nutrientKey" = 'protein'), 0),
      coalesce(max(nutrient_totals.amount) filter (where nutrient_totals."nutrientKey" = 'carbs'), 0),
      coalesce(max(nutrient_totals.amount) filter (where nutrient_totals."nutrientKey" = 'fat'), 0),
      now()
    from (
      select
        flen."nutrientKey",
        sum(flen.amount)::numeric(12, 4) as amount
      from ${foodLogEntries} fle
      inner join ${foodLogEntryNutrients} flen
        on flen."entryId" = fle.id
      where fle."userId" = ${userId}
        and fle."logDate" = ${logDate}
      group by flen."nutrientKey"
    ) nutrient_totals
    on conflict ("userId", "logDate") do update set
      "nutrients" = excluded."nutrients",
      "calories" = excluded."calories",
      "protein" = excluded."protein",
      "carbs" = excluded."carbs",
      "fat" = excluded."fat",
      "updatedAt" = now()
  `)
}

async function getDailySummaryMacros(userId: string, logDate: string) {
  const summary = await db.query.dailyNutritionSummaries.findFirst({
    where: and(
      eq(dailyNutritionSummaries.userId, userId),
      eq(dailyNutritionSummaries.logDate, logDate)
    ),
    columns: {
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
  })

  return {
    calories: summary ? Number(summary.calories) : 0,
    protein: summary ? Number(summary.protein) : 0,
    carbs: summary ? Number(summary.carbs) : 0,
    fat: summary ? Number(summary.fat) : 0,
  }
}

export async function logExternalFood(
  userId: string,
  input: LogFoodInput
): Promise<LogFoodResult> {
  const timezone = await getUserTimezone(userId)
  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date()
  const logDate = input.logDate ?? toIsoDate(eatenAt, timezone)
  const mealType =
    input.mealType ?? inferMealType(getHourInTimezone(eatenAt, timezone))
  const { foodId, snapshotId, summary, nutrition } =
    await ensureExternalFoodSnapshot(input.sourceItemId)

  const entryId = await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(foodLogEntries)
      .values({
        userId,
        logDate,
        timezoneAtLog: timezone,
        eatenAt,
        mealType,
        entryType: "food",
        foodId,
        snapshotId,
        foodName: summary.name,
        brand: summary.brand ?? null,
        servingLabel: nutrition.servingLabel,
        servingQuantity: toNumericString(nutrition.servingQuantity),
        servingUnit: nutrition.servingUnit,
        servingsConsumed: toNumericString(input.servingsConsumed),
        notes: input.notes,
      })
      .returning({ id: foodLogEntries.id })

    const nutrientRows = Object.entries(nutrition.nutrients).map(
      ([nutrientKey, amount]) => ({
        entryId: entry.id,
        nutrientKey: nutrientKey as NutrientKey,
        amount: toNumericString(amount * input.servingsConsumed),
      })
    )

    if (nutrientRows.length > 0) {
      await tx.insert(foodLogEntryNutrients).values(nutrientRows)
    }

    await refreshDailyNutritionSummary(tx, userId, logDate)

    return entry.id
  })

  return {
    entryId,
    clientMutationId: input.clientMutationId,
    foodId,
    snapshotId,
    logDate,
    eatenAt: eatenAt.toISOString(),
    mealType,
    totals: await getDailySummaryMacros(userId, logDate),
  }
}
