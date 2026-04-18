import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"
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
      {/* Ambient background — radial gradient + subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

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
