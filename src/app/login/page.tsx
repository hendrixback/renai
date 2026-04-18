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
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm from={safeFrom} />
      </div>
    </div>
  )
}
