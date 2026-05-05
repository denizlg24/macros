import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/api/session"
import { getFoodHistory } from "@/lib/foods/service"
import { getDailyCalorieSummary } from "@/lib/queries/calorie-summary"
import { getDashboardData } from "@/lib/queries/dashboard"

export async function GET() {
  const { session, response } = await getRequiredSession()
  if (!session) return response

  const [dashboard, calorieSummary, foodHistory] = await Promise.all([
    getDashboardData(session.user.id),
    getDailyCalorieSummary(session.user.id),
    getFoodHistory(session.user.id, undefined, 20),
  ])

  return NextResponse.json({
    calorieSummary,
    dashboard,
    fetchedAt: new Date().toISOString(),
    foodHistory,
  })
}
