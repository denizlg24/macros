import {
  type ExternalFoodNutrition,
  type ExternalFoodSummary,
  externalNutritionResponseSchema,
  externalSearchResponseSchema,
  externalSummaryResponseSchema,
  type FoodSearchParams,
} from "@/lib/foods/contracts"

const nutritionApiBaseUrl =
  process.env.NUTRITION_API_BASE_URL ?? "https://nutrition.denizlg24.com"

class NutritionSourceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

function buildUrl(path: string, params?: URLSearchParams) {
  const url = new URL(path, nutritionApiBaseUrl)
  if (params) {
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value)
    }
  }
  return url
}

async function fetchSourceJson(url: URL) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new NutritionSourceError(
      `Nutrition API request failed with ${response.status}`,
      response.status
    )
  }

  return response.json()
}

function appendOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value !== undefined && value !== "") {
    params.set(key, value.toString())
  }
}

export async function searchNutritionFoods(
  input: FoodSearchParams
): Promise<ExternalFoodSummary[]> {
  if (!input.q && !input.brand) {
    return []
  }

  const params = new URLSearchParams()
  appendOptionalParam(params, "q", input.q)
  appendOptionalParam(params, "brand", input.brand)
  appendOptionalParam(params, "lang", input.lang)
  appendOptionalParam(params, "limit", input.limit)
  appendOptionalParam(params, "minScore", input.minScore)

  const json = await fetchSourceJson(buildUrl("/api/items/search", params))
  return externalSearchResponseSchema.parse(json).data
}

export async function getNutritionFoodSummary(
  itemId: string
): Promise<ExternalFoodSummary> {
  const json = await fetchSourceJson(buildUrl(`/api/items/${itemId}`))
  return externalSummaryResponseSchema.parse(json).data
}

export async function getNutritionFoodByBarcode(
  barcode: string
): Promise<ExternalFoodSummary> {
  const json = await fetchSourceJson(
    buildUrl(`/api/items/barcode/${encodeURIComponent(barcode)}`)
  )
  return externalSummaryResponseSchema.parse(json).data
}

export async function getNutritionFoodNutrition(
  itemId: string
): Promise<ExternalFoodNutrition> {
  const json = await fetchSourceJson(buildUrl(`/api/items/${itemId}/nutrition`))
  return externalNutritionResponseSchema.parse(json).data
}

export function getNutritionSourceStatus(error: unknown) {
  return error instanceof NutritionSourceError ? error.status : 502
}
