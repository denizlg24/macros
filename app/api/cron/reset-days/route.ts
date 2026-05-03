import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { finalizeClosedNutritionDays } from "@/lib/services/day-rollover"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function timingSafeEqualText(left: string, right: string) {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)

  if (leftBytes.length !== rightBytes.length) {
    return false
  }

  return timingSafeEqual(leftBytes, rightBytes)
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  return authorization.slice("Bearer ".length)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const token = getBearerToken(request)

  if (!secret || !token || !timingSafeEqualText(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await finalizeClosedNutritionDays()

  return NextResponse.json({
    status: "ok",
    ...result,
  })
}
