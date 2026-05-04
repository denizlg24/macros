import { redirect } from "next/navigation"
import { getDashboardData } from "@/lib/queries/dashboard"
import { getSession } from "@/lib/session"
import { InsightsSection } from "./_components/insights-section"
import { NutritionSection } from "./_components/nutrition-section"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const {
    today,
    timezone,
    caloriePreference,
    consumed,
    targets,
    energyBalance,
    goalProgress,
  } = await getDashboardData(session.user.id)

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .toUpperCase()

  return (
    <div className="min-h-screen pb-36 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <p className="text-xs text-muted-foreground tracking-widest mb-1">
          {dateLabel}
        </p>
        <h1 className="text-3xl font-black tracking-tight">DASHBOARD</h1>
      </div>

      <div className="px-5 mb-2">
        <p className="text-lg font-bold">Daily Nutrition</p>
      </div>
      <NutritionSection
        consumed={consumed}
        targets={targets}
        initialPreference={caloriePreference}
      />

      <div className="h-px bg-border mx-5 mt-6" />

      <InsightsSection
        energyBalance={energyBalance}
        goalProgress={goalProgress}
        targetCalories={targets.calories}
      />

      <p className="text-center text-xs text-muted-foreground/40 mt-8 pb-2">
        {today}
      </p>
    </div>
  )
}
