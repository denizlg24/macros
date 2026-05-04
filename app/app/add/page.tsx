import { redirect } from "next/navigation"
import { getDailyCalorieSummary } from "@/lib/queries/calorie-summary"
import { getSession } from "@/lib/session"
import { AddFoodLogic } from "./_components/add-food-logic"

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/")

  const summary = await getDailyCalorieSummary(session.user.id)

  return <AddFoodLogic calorieSummary={summary} />
}
