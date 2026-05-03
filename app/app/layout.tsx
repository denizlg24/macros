import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/db/connection"
import { userProfiles } from "@/db/schema"
import { getSession } from "@/lib/session"
import { DashboardHeader } from "./_components/dashboard-header"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
    columns: { onboardingCompletedAt: true },
  })

  if (!userProfile?.onboardingCompletedAt) {
    redirect("/register/complete")
  }

  return (
    <>
      {children}
      <DashboardHeader />
    </>
  )
}
