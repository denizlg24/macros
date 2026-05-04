import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/api/session"
import { foodSearchParamsSchema } from "@/lib/foods/contracts"
import { toFoodSearchItem } from "@/lib/foods/service"
import { searchNutritionFoods } from "@/lib/foods/source"

export async function GET(request: Request) {
  const { session, response } = await getRequiredSession()

  if (!session) {
    return response
  }

  const url = new URL(request.url)
  const parsed = foodSearchParamsSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
    lang: url.searchParams.get("lang") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    minScore: url.searchParams.get("minScore") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid food search", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const sourceItems = await searchNutritionFoods(parsed.data)

  return NextResponse.json({
    items: sourceItems.map(toFoodSearchItem),
    fetchedAt: new Date().toISOString(),
  })
}
