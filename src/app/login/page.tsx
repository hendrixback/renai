import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { LoginBackdrop } from "@/components/login-backdrop"
import { ModeToggle } from "@/components/mode-toggle"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  const { from } = await searchParams
  const safeFrom =
    typeof from === "string" && from.startsWith("/") ? from : "/dashboard"

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10">
      <LoginBackdrop />

      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <LoginForm from={safeFrom} />
      </div>

      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        <a
          href="#"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Terms
        </a>
        <span className="mx-2">·</span>
        <a
          href="#"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy
        </a>
      </p>
    </div>
  )
}
