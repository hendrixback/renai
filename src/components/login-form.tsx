"use client"

import { useActionState } from "react"
import { LeafIcon, Loader2 } from "lucide-react"

import { login, type LoginState } from "@/app/login/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: LoginState = { error: null }

export function LoginForm({
  from,
  className,
  ...props
}: React.ComponentProps<"div"> & { from?: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <LeafIcon className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Renai
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your workspace
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/60 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/5 sm:p-8">
        <form action={formAction}>
          <input type="hidden" name="from" value={from ?? "/dashboard"} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a
                  href="#"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            {state?.error ? (
              <div
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {state.error}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </FieldGroup>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Renai is invite-only. Need access? Ask your company admin.
      </p>
    </div>
  )
}
