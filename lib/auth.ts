import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"

import { db } from "@/db/connection"
import { schema } from "@/db/schema"
import { sendEmail } from "@/lib/email"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Macros password",
        html: `<p>Use this link to reset your password:</p><p><a href="${url}">${url}</a></p>`,
        text: `Use this link to reset your password: ${url}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Macros email",
        html: `<p>Verify your email address to finish setting up Macros:</p><p><a href="${url}">${url}</a></p>`,
        text: `Verify your email address to finish setting up Macros: ${url}`,
      })
    },
  },
  plugins: [nextCookies()],
})
