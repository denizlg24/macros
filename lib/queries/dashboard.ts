import { and, eq, gte, lte, sql } from "drizzle-orm"
import { db } from "@/db/connection"
import {
  dailyNutritionSummaries,
  energyExpenditureEstimates,
  foodLogEntries,
  foodLogEntryNutrients,
  nutritionPlans,
  userProfiles,
} from "@/db/schema"

export type DailyMacros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type NutritionTargets = {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type EnergyBalancePoint = {
  date: string
  consumed: number
  tdee: number | null
}

export type GoalProgress = {
  daysTracked: number
  daysOnTarget: number
  totalDays: number
}

type ActivePlan = {
  targets: NutritionTargets
  startDate: string | null
}

export type CaloriePreference = "consumed" | "remaining"

export type DashboardData = {
  today: string
  timezone: string
  caloriePreference: CaloriePreference
  consumed: DailyMacros
  targets: NutritionTargets
  energyBalance: EnergyBalancePoint[]
  goalProgress: GoalProgress
}

function toIsoDate(date: Date, timezone: string): string {
  // en-CA gives YYYY-MM-DD format
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date)
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const fromMs = new Date(from + "T00:00:00Z").getTime()
  const toMs = new Date(to + "T00:00:00Z").getTime()
  return Math.max(1, Math.floor((toMs - fromMs) / msPerDay) + 1)
}

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().split("T")[0]
}

async function getDailyNutrition(
  userId: string,
  date: string
): Promise<DailyMacros> {
  const summary = await db.query.dailyNutritionSummaries.findFirst({
    where: and(
      eq(dailyNutritionSummaries.userId, userId),
      eq(dailyNutritionSummaries.logDate, date)
    ),
    columns: {
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
  })

  if (summary) {
    return {
      calories: Number(summary.calories),
      protein: Number(summary.protein),
      carbs: Number(summary.carbs),
      fat: Number(summary.fat),
    }
  }

  const [row] = await db
    .select({
      calories: sql<string>`coalesce(sum(${foodLogEntryNutrients.amount}) filter (where ${foodLogEntryNutrients.nutrientKey} = 'calories'), 0)`,
      protein: sql<string>`coalesce(sum(${foodLogEntryNutrients.amount}) filter (where ${foodLogEntryNutrients.nutrientKey} = 'protein'), 0)`,
      carbs: sql<string>`coalesce(sum(${foodLogEntryNutrients.amount}) filter (where ${foodLogEntryNutrients.nutrientKey} = 'carbs'), 0)`,
      fat: sql<string>`coalesce(sum(${foodLogEntryNutrients.amount}) filter (where ${foodLogEntryNutrients.nutrientKey} = 'fat'), 0)`,
    })
    .from(foodLogEntries)
    .innerJoin(
      foodLogEntryNutrients,
      eq(foodLogEntryNutrients.entryId, foodLogEntries.id)
    )
    .where(
      and(eq(foodLogEntries.userId, userId), eq(foodLogEntries.logDate, date))
    )

  return {
    calories: row ? Number(row.calories) : 0,
    protein: row ? Number(row.protein) : 0,
    carbs: row ? Number(row.carbs) : 0,
    fat: row ? Number(row.fat) : 0,
  }
}

async function getActiveNutritionPlan(userId: string): Promise<ActivePlan> {
  const plan = await db.query.nutritionPlans.findFirst({
    where: and(
      eq(nutritionPlans.userId, userId),
      eq(nutritionPlans.status, "active")
    ),
    columns: {
      startDate: true,
      calorieTarget: true,
      proteinTarget: true,
      carbsTarget: true,
      fatTarget: true,
    },
  })
  if (!plan) {
    return {
      targets: { calories: null, protein: null, carbs: null, fat: null },
      startDate: null,
    }
  }
  return {
    targets: {
      calories: plan.calorieTarget != null ? Number(plan.calorieTarget) : null,
      protein: plan.proteinTarget != null ? Number(plan.proteinTarget) : null,
      carbs: plan.carbsTarget != null ? Number(plan.carbsTarget) : null,
      fat: plan.fatTarget != null ? Number(plan.fatTarget) : null,
    },
    startDate: plan.startDate,
  }
}

async function getEnergyBalance(
  userId: string,
  today: string,
  days: number
): Promise<EnergyBalancePoint[]> {
  const startDate = subtractDays(today, days - 1)

  const [summaries, estimates] = await Promise.all([
    db.query.dailyNutritionSummaries.findMany({
      where: and(
        eq(dailyNutritionSummaries.userId, userId),
        gte(dailyNutritionSummaries.logDate, startDate),
        lte(dailyNutritionSummaries.logDate, today)
      ),
      columns: { logDate: true, calories: true },
    }),
    db.query.energyExpenditureEstimates.findMany({
      where: and(
        eq(energyExpenditureEstimates.userId, userId),
        gte(energyExpenditureEstimates.logDate, startDate),
        lte(energyExpenditureEstimates.logDate, today)
      ),
      columns: { logDate: true, estimatedTdee: true },
    }),
  ])

  const calMap = new Map(summaries.map((s) => [s.logDate, Number(s.calories)]))
  const tdeeMap = new Map(
    estimates.map((e) => [e.logDate, Number(e.estimatedTdee)])
  )

  const result: EnergyBalancePoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = subtractDays(today, i)
    result.push({
      date,
      consumed: calMap.get(date) ?? 0,
      tdee: tdeeMap.has(date) ? (tdeeMap.get(date) ?? null) : null,
    })
  }
  return result
}

async function getRecentSummaries(
  userId: string,
  today: string,
  days: number
): Promise<Array<{ logDate: string; calories: string }>> {
  const startDate = subtractDays(today, days - 1)
  return db.query.dailyNutritionSummaries.findMany({
    where: and(
      eq(dailyNutritionSummaries.userId, userId),
      gte(dailyNutritionSummaries.logDate, startDate),
      lte(dailyNutritionSummaries.logDate, today)
    ),
    columns: { logDate: true, calories: true },
  })
}

function computeGoalProgress(
  summaries: Array<{ calories: string }>,
  targetCalories: number | null,
  totalDays: number
): GoalProgress {
  const tracked = summaries.filter((s) => Number(s.calories) > 0)
  const onTarget =
    targetCalories != null
      ? tracked.filter(
          (s) =>
            Math.abs(Number(s.calories) - targetCalories) / targetCalories <=
            0.1
        )
      : []
  return {
    daysTracked: tracked.length,
    daysOnTarget: onTarget.length,
    totalDays,
  }
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true, caloriePreference: true },
  })
  const timezone = profile?.timezone ?? "UTC"
  const caloriePreference: CaloriePreference =
    profile?.caloriePreference ?? "consumed"
  const today = toIsoDate(new Date(), timezone)

  const [consumed, { targets, startDate }, energyBalanceFromSummaries] =
    await Promise.all([
      getDailyNutrition(userId, today),
      getActiveNutritionPlan(userId),
      getEnergyBalance(userId, today, 7),
    ])
  const energyBalance = energyBalanceFromSummaries.map((point) =>
    point.date === today ? { ...point, consumed: consumed.calories } : point
  )

  const planDays = startDate ? daysBetween(startDate, today) : 0

  const recentSummaryRows =
    planDays > 0 ? await getRecentSummaries(userId, today, planDays) : []
  const recentSummaries = recentSummaryRows.some((row) => row.logDate === today)
    ? recentSummaryRows.map((row) =>
        row.logDate === today
          ? { ...row, calories: consumed.calories.toString() }
          : row
      )
    : [
        ...recentSummaryRows,
        { logDate: today, calories: consumed.calories.toString() },
      ]

  const goalProgress = computeGoalProgress(
    recentSummaries,
    targets.calories,
    planDays
  )

  return {
    today,
    timezone,
    caloriePreference,
    consumed,
    targets,
    energyBalance,
    goalProgress,
  }
}
