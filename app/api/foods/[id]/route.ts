import { NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession } from "@/lib/api/session"
import {
  ensureExternalFoodSnapshot,
  toFoodSearchItem,
} from "@/lib/foods/service"
import { toNutritionSourceErrorResponse } from "../_lib/source-error-response"

const paramsSchema = z.object({ id: z.uuid() })

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { session, response } = await getRequiredSession()

  if (!session) {
    return response
  }

  const parsed = paramsSchema.safeParse(await context.params)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid food id" }, { status: 400 })
  }

  try {
    const result = await ensureExternalFoodSnapshot(parsed.data.id)

    return NextResponse.json({
      item: toFoodSearchItem(result.summary),
      nutrition: result.nutrition,
      localFoodId: result.foodId,
      snapshotId: result.snapshotId,
      createdSnapshot: result.createdSnapshot,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    return toNutritionSourceErrorResponse(error)
  }
}
