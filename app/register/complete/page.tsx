import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { CompleteRegistrationForm } from "./_components/complete-registration-form"

export default async function CompleteRegistrationPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/")
  }

  return <CompleteRegistrationForm />
}
