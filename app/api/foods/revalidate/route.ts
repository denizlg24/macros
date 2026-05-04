import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/api/session"
import { foodRevalidateBodySchema } from "@/lib/foods/contracts"
import {
  ensureExternalFoodSnapshot,
  toFoodSearchItem,
} from "@/lib/foods/service"

export async function POST(request: Request) {
  const { session, response } = await getRequiredSession()

  if (!session) {
    return response
  }

  const body = await request.json().catch(() => null)
  const parsed = foodRevalidateBodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid revalidation request", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const results = await Promise.all(
    parsed.data.itemIds.map(async (itemId) => {
      const result = await ensureExternalFoodSnapshot(itemId)
      return {
        item: toFoodSearchItem(result.summary),
        localFoodId: result.foodId,
        snapshotId: result.snapshotId,
        createdSnapshot: result.createdSnapshot,
      }
    })
  )

  return NextResponse.json({
    items: results,
    fetchedAt: new Date().toISOString(),
  })
}
