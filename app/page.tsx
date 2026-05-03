import { AuthForm } from "@/components/auth-form"

export default function Page() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-120 flex-col px-5 pt-5 pb-6 sm:px-7">
        <header className="border-b pb-5 text-center">
          <p className="text-base font-semibold">Macros</p>
        </header>

        <section className="flex flex-1 flex-col justify-center py-9">
          <AuthForm />
        </section>

        <footer className="border-t pt-4 text-center text-xs leading-5 text-muted-foreground">
          Your free macro tracker. Built by{" "}
          <a href="https://denizlg24.com" className="underline">
            denizl24.com
          </a>
        </footer>
      </div>
    </main>
  )
}
