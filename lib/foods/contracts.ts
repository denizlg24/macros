import { z } from "zod"

import { isNutrientKey } from "@/lib/foods/nutrients"

const numericValueSchema = z.union([z.number(), z.string()]).transform(Number)

export const foodSearchParamsSchema = z.object({
  q: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  lang: z.enum(["english", "portuguese", "spanish", "french"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  minScore: z.coerce.number().min(0).optional(),
})

export const externalFoodSummarySchema = z.object({
  id: z.uuid(),
  barcode: z.string().nullable().optional(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  servingLabel: z.string().nullable().optional(),
  caloriesPerServing: numericValueSchema.nullable().optional(),
  proteinPerServing: numericValueSchema.nullable().optional(),
  carbsPerServing: numericValueSchema.nullable().optional(),
  fatPerServing: numericValueSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  rank: numericValueSchema.optional(),
  score: numericValueSchema.optional(),
})

const passthroughNutritionSchema = z
  .object({
    itemId: z.uuid(),
    servingLabel: z.string().min(1),
    servingQnty: numericValueSchema,
    servingQuantity: numericValueSchema.optional(),
    servingUnit: z.string().min(1),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough()
  .transform((nutrition) => {
    const nutrients: Record<string, number> = {}

    for (const [key, value] of Object.entries(nutrition)) {
      if (
        isNutrientKey(key) &&
        (typeof value === "number" || typeof value === "string")
      ) {
        nutrients[key] = Number(value)
      }
    }

    return {
      ...nutrition,
      servingQuantity: nutrition.servingQuantity ?? nutrition.servingQnty,
      nutrients,
    }
  })

export const externalFoodNutritionSchema = passthroughNutritionSchema

export const externalSearchResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(externalFoodSummarySchema),
  requestId: z.string().optional(),
})

export const externalSummaryResponseSchema = z.object({
  success: z.literal(true),
  data: externalFoodSummarySchema,
  requestId: z.string().optional(),
})

export const externalNutritionResponseSchema = z.object({
  success: z.literal(true),
  data: externalFoodNutritionSchema,
  requestId: z.string().optional(),
})

export const foodHistoryQuerySchema = z.object({
  at: z.coerce.number().int().min(0).max(23).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const foodRevalidateBodySchema = z.object({
  itemIds: z.array(z.uuid()).min(1).max(50),
})

export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"])

export const foodSearchItemSchema = z.object({
  id: z.uuid(),
  barcode: z.string().nullable(),
  name: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  caloriesPerServing: z.number().nullable(),
  proteinPerServing: z.number().nullable(),
  carbsPerServing: z.number().nullable(),
  fatPerServing: z.number().nullable(),
  sourceUpdatedAt: z.string().nullable(),
  rank: z.number().nullable(),
  score: z.number().nullable(),
})

export const foodHistoryItemSchema = foodSearchItemSchema.extend({
  localFoodId: z.uuid(),
  lastLogEntryId: z.uuid(),
  lastLoggedAt: z.string().nullable(),
  lastLogDate: z.iso.date(),
  lastMealType: mealTypeSchema,
  lastServingsConsumed: z.number(),
  lastServingQuantity: z.number(),
  lastServingUnit: z.string(),
  lastServingLabel: z.string().nullable(),
})

export const foodSearchResponseSchema = z.object({
  items: z.array(foodSearchItemSchema),
  fetchedAt: z.string(),
})

export const foodHistoryResponseSchema = z.object({
  items: z.array(foodHistoryItemSchema),
  fetchedAt: z.string(),
})

export const foodRevalidateResponseSchema = z.object({
  items: z.array(
    z.object({
      item: foodSearchItemSchema,
      localFoodId: z.uuid(),
      snapshotId: z.uuid(),
      createdSnapshot: z.boolean(),
    })
  ),
  fetchedAt: z.string(),
})

export const logFoodBodySchema = z.object({
  clientMutationId: z.uuid().optional(),
  sourceItemId: z.uuid(),
  servingsConsumed: z.number().positive().max(9999).default(1),
  eatenAt: z.iso.datetime({ offset: true }).optional(),
  logDate: z.iso.date().optional(),
  mealType: mealTypeSchema.optional(),
  notes: z.string().trim().max(500).optional(),
})

export const logFoodResponseSchema = z.object({
  entry: z.object({
    entryId: z.uuid(),
    clientMutationId: z.uuid().optional(),
    foodId: z.uuid(),
    snapshotId: z.uuid(),
    logDate: z.iso.date(),
    eatenAt: z.string(),
    mealType: mealTypeSchema,
  }),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
})

export type FoodSearchItem = z.infer<typeof foodSearchItemSchema>

export type FoodHistoryItem = z.infer<typeof foodHistoryItemSchema>

export interface LogFoodResult {
  entryId: string
  clientMutationId?: string
  foodId: string
  snapshotId: string
  logDate: string
  eatenAt: string
  mealType: z.infer<typeof mealTypeSchema>
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export type FoodSearchParams = z.infer<typeof foodSearchParamsSchema>
export type ExternalFoodSummary = z.infer<typeof externalFoodSummarySchema>
export type ExternalFoodNutrition = z.infer<typeof externalFoodNutritionSchema>
export type LogFoodInput = z.infer<typeof logFoodBodySchema>
