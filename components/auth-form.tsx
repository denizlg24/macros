"use client"

import { ArrowRight, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

const authCopy = {
  login: {
    title: "Log in",
    description:
      "Open your food log, recipes, weight trend, and expenditure estimate.",
    action: "Enter Macros",
  },
  signup: {
    title: "Create account",
    description:
      "Use email and password. Verification is required before sign-in.",
    action: "Create account",
  },
} satisfies Record<
  AuthMode,
  {
    title: string
    description: string
    action: string
  }
>

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState("")
  const copy = authCopy[mode]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage("")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const name = String(formData.get("name") ?? "")

    const response =
      mode === "login"
        ? await authClient.signIn.email({
            email,
            password,
            callbackURL: "/",
          })
        : await authClient.signUp.email({
            email,
            password,
            name,
            callbackURL: "/",
          })

    setIsPending(false)

    if (response.error) {
      setMessage(response.error.message ?? "Something went wrong.")
      return
    }

    setMessage(
      mode === "signup"
        ? "Check your inbox to verify your email before signing in."
        : "Signed in."
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-4xl leading-none font-semibold">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-80 text-sm leading-6 text-muted-foreground">
          {copy.description}
        </p>
      </div>

      <div className="mb-7 flex justify-center gap-5 border-b">
        {(["login", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item)
              setMessage("")
            }}
            className={cn(
              "relative pb-3 text-sm font-semibold text-muted-foreground transition-colors",
              mode === item && "text-foreground"
            )}
          >
            {item === "login" ? "Log in" : "Sign up"}
            {mode === item ? (
              <span className="absolute inset-x-0 -bottom-px h-px bg-current" />
            ) : null}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "signup" ? (
          <AuthField
            autoComplete="name"
            label="Name"
            name="name"
            placeholder="Deniz"
            required
          />
        ) : null}

        <AuthField
          autoComplete="email"
          inputMode="email"
          label="Email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <AuthField
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          label="Password"
          minLength={8}
          name="password"
          placeholder="Eight characters minimum"
          required
          type="password"
        />

        <div className="pt-2">
          <Button
            className="h-13 w-full justify-between rounded-none border-0 bg-primary px-0 pl-4 pr-3 text-base text-primary-foreground hover:bg-primary/85"
            disabled={isPending}
            size="lg"
            type="submit"
          >
            <span>{copy.action}</span>
            {isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <ArrowRight />
            )}
          </Button>
        </div>

        <p
          aria-live="polite"
          className="min-h-6 text-center text-sm leading-6 text-muted-foreground"
        >
          {message}
        </p>
      </form>
    </>
  )
}

function AuthField({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[0.66rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <input
        className="mt-2 h-12 w-full rounded-none border-0 border-b bg-transparent px-0 text-[1.05rem] outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-ring focus:ring-0"
        name={name}
        {...props}
      />
    </label>
  )
}
