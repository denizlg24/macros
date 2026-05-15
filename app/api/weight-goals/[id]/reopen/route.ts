import { NextResponse } from "next/server"
import { getRequiredSession } from "@/lib/api/session"
import { reopenGoal } from "@/lib/goals/service"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await getRequiredSession()
  if (!session) return response
  const { id } = await params
  try {
    const goal = await reopenGoal(session.user.id, id)
    return NextResponse.json({ goal })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: message },
      { status: message === "Goal not found" ? 404 : 500 }
    )
  }
}
