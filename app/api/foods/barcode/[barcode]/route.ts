import { NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession } from "@/lib/api/session"
import {
  ensureExternalFoodSnapshot,
  toFoodSearchItem,
} from "@/lib/foods/service"
import { getNutritionFoodByBarcode } from "@/lib/foods/source"

const paramsSchema = z.object({ barcode: z.string().trim().min(1).max(128) })

export async function GET(
  _request: Request,
  context: { params: Promise<{ barcode: string }> }
) {
  const { session, response } = await getRequiredSession()

  if (!session) {
    return response
  }

  const parsed = paramsSchema.safeParse(await context.params)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 })
  }

  const summary = await getNutritionFoodByBarcode(parsed.data.barcode)
  const result = await ensureExternalFoodSnapshot(summary.id, summary)

  return NextResponse.json({
    item: toFoodSearchItem(result.summary),
    nutrition: result.nutrition,
    localFoodId: result.foodId,
    snapshotId: result.snapshotId,
    createdSnapshot: result.createdSnapshot,
    fetchedAt: new Date().toISOString(),
  })
}
