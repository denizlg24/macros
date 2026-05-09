import { and, desc, eq } from "drizzle-orm"

import { db } from "@/db/connection"
import {
  foodLogEntries,
  foodLogEntryNutrients,
  recipeIngredients,
  recipeNutritionSnapshots,
  recipeSnapshotNutrients,
  recipes,
  userProfiles,
} from "@/db/schema"
import type { NutrientKey } from "@/lib/foods/nutrients"
import {
  ensureExternalFoodSnapshot,
  getCustomFoodSnapshot,
  refreshDailyNutritionSummary,
} from "@/lib/foods/service"
import type {
  CreateRecipeInput,
  LogRecipeInput,
  RecipeSummary,
} from "@/lib/recipes/contracts"

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function toNumericString(value: number) {
  return Number.isFinite(value) ? value.toFixed(4) : "0"
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
  if (hour >= 5 && hour < 11) return "breakfast"
  if (hour >= 11 && hour < 16) return "lunch"
  if (hour >= 17 && hour < 22) return "dinner"
  return "snack"
}

async function getUserTimezone(userId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { timezone: true },
  })
  return profile?.timezone ?? "UTC"
}

async function resolveIngredient(userId: string, sourceItemId: string) {
  const customFood = await getCustomFoodSnapshot(userId, sourceItemId)
  if (customFood) {
    return {
      foodId: customFood.foodId,
      snapshotId: customFood.snapshotId,
      nutrition: customFood.nutrition,
    }
  }

  const externalFood = await ensureExternalFoodSnapshot(sourceItemId)
  return {
    foodId: externalFood.foodId,
    snapshotId: externalFood.snapshotId,
    nutrition: externalFood.nutrition,
  }
}

function emptyNutrients() {
  return {} as Record<string, number>
}

async function latestRecipeSnapshot(recipeId: string) {
  return db.query.recipeNutritionSnapshots.findFirst({
    where: eq(recipeNutritionSnapshots.recipeId, recipeId),
    orderBy: desc(recipeNutritionSnapshots.createdAt),
    with: {
      nutrients: { columns: { nutrientKey: true, amountPerServing: true } },
    },
  })
}

function toSummary(
  recipe: Pick<
    typeof recipes.$inferSelect,
    "id" | "name" | "servings" | "servingLabel" | "createdAt"
  >,
  snapshot: Pick<
    typeof recipeNutritionSnapshots.$inferSelect,
    | "caloriesPerServing"
    | "proteinPerServing"
    | "carbsPerServing"
    | "fatPerServing"
  >,
  ingredientCount: number
): RecipeSummary {
  return {
    id: recipe.id,
    name: recipe.name,
    servingLabel: recipe.servingLabel,
    servings: Number(recipe.servings),
    caloriesPerServing: Number(snapshot.caloriesPerServing),
    proteinPerServing: Number(snapshot.proteinPerServing),
    carbsPerServing: Number(snapshot.carbsPerServing),
    fatPerServing: Number(snapshot.fatPerServing),
    ingredientCount,
    createdAt: recipe.createdAt.toISOString(),
  }
}

export async function createRecipeFromFoods(
  userId: string,
  input: CreateRecipeInput
) {
  const resolvedIngredients = await Promise.all(
    input.ingredients.map(async (ingredient) => ({
      ...ingredient,
      resolved: await resolveIngredient(userId, ingredient.sourceItemId),
    }))
  )

  const totalNutrients = emptyNutrients()
  for (const ingredient of resolvedIngredients) {
    for (const [key, amount] of Object.entries(
      ingredient.resolved.nutrition.nutrients
    )) {
      totalNutrients[key] =
        (totalNutrients[key] ?? 0) + amount * ingredient.servingsConsumed
    }
  }

  const created = await db.transaction(async (tx) => {
    const [recipe] = await tx
      .insert(recipes)
      .values({
        userId,
        name: input.name.trim(),
        servings: "1",
        servingLabel: "recipe",
        status: "active",
      })
      .returning()

    await tx.insert(recipeIngredients).values(
      resolvedIngredients.map((ingredient, position) => ({
        recipeId: recipe.id,
        position,
        ingredientType: "food" as const,
        foodId: ingredient.resolved.foodId,
        foodSnapshotId: ingredient.resolved.snapshotId,
        quantity: toNumericString(ingredient.servingsConsumed),
        unit: "serving",
        servings: toNumericString(ingredient.servingsConsumed),
      }))
    )

    const [snapshot] = await tx
      .insert(recipeNutritionSnapshots)
      .values({
        recipeId: recipe.id,
        servings: recipe.servings,
        servingLabel: recipe.servingLabel,
        caloriesPerServing: toNumericString(totalNutrients.calories ?? 0),
        proteinPerServing: toNumericString(totalNutrients.protein ?? 0),
        carbsPerServing: toNumericString(totalNutrients.carbs ?? 0),
        fatPerServing: toNumericString(totalNutrients.fat ?? 0),
        nutrientsPerServing: totalNutrients,
      })
      .returning()

    const nutrientRows = Object.entries(totalNutrients).map(
      ([nutrientKey, amount]) => ({
        snapshotId: snapshot.id,
        nutrientKey: nutrientKey as NutrientKey,
        amountPerServing: toNumericString(amount),
      })
    )
    if (nutrientRows.length > 0) {
      await tx.insert(recipeSnapshotNutrients).values(nutrientRows)
    }

    return { recipe, snapshot }
  })

  return toSummary(created.recipe, created.snapshot, resolvedIngredients.length)
}

export async function getUserRecipes(userId: string): Promise<RecipeSummary[]> {
  const recipeRows = await db.query.recipes.findMany({
    where: and(eq(recipes.userId, userId), eq(recipes.status, "active")),
    orderBy: desc(recipes.createdAt),
    with: {
      ingredients: { columns: { id: true } },
    },
  })

  const summaries: RecipeSummary[] = []
  for (const recipe of recipeRows) {
    const snapshot = await latestRecipeSnapshot(recipe.id)
    if (!snapshot) continue
    summaries.push(toSummary(recipe, snapshot, recipe.ingredients.length))
  }

  return summaries
}

export async function logRecipe(userId: string, input: LogRecipeInput) {
  const timezone = await getUserTimezone(userId)
  const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date()
  const logDate = input.logDate ?? toIsoDate(eatenAt, timezone)
  const mealType =
    input.mealType ?? inferMealType(getHourInTimezone(eatenAt, timezone))

  const recipe = await db.query.recipes.findFirst({
    where: and(
      eq(recipes.id, input.recipeId),
      eq(recipes.userId, userId),
      eq(recipes.status, "active")
    ),
  })
  if (!recipe) {
    throw new Error("Recipe not found")
  }

  const snapshot = await latestRecipeSnapshot(recipe.id)
  if (!snapshot) {
    throw new Error("Recipe has no nutrition snapshot")
  }

  const logged = await db.transaction(async (tx: DbTransaction) => {
    const [entry] = await tx
      .insert(foodLogEntries)
      .values({
        userId,
        logDate,
        timezoneAtLog: timezone,
        eatenAt,
        mealType,
        entryType: "recipe",
        recipeId: recipe.id,
        recipeSnapshotId: snapshot.id,
        foodName: recipe.name,
        brand: null,
        servingLabel: snapshot.servingLabel,
        servingQuantity: toNumericString(1),
        servingUnit: snapshot.servingLabel,
        servingsConsumed: toNumericString(input.servingsConsumed),
        notes: input.notes,
      })
      .returning({ id: foodLogEntries.id })

    const nutrientRows = snapshot.nutrients.map((nutrient) => ({
      entryId: entry.id,
      nutrientKey: nutrient.nutrientKey as NutrientKey,
      amount: toNumericString(
        Number(nutrient.amountPerServing) * input.servingsConsumed
      ),
    }))

    if (nutrientRows.length > 0) {
      await tx.insert(foodLogEntryNutrients).values(nutrientRows)
    }

    const totals = await refreshDailyNutritionSummary(tx, userId, logDate)

    return { entryId: entry.id, totals }
  })

  return {
    entryId: logged.entryId,
    clientMutationId: input.clientMutationId,
    recipeId: recipe.id,
    recipeSnapshotId: snapshot.id,
    logDate,
    eatenAt: eatenAt.toISOString(),
    mealType,
    totals: logged.totals,
  }
}
