"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"

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
        <h1 className="font-display bg-gradient-to-b from-white via-white to-emerald-200/90 bg-clip-text text-7xl font-bold tracking-tight text-transparent leading-none drop-shadow-[0_4px_32px_rgba(96,187,115,0.35)]">
          RenAI
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your workspace
        </p>
      </div>

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
              className="h-11 border-white/15 bg-white/5 text-base backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:bg-white/10"
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
              className="h-11 border-white/15 bg-white/5 text-base backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:bg-white/10"
            />
          </Field>

          {state?.error ? (
            <div
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-sm"
              role="alert"
            >
              {state.error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full bg-gradient-to-b from-white via-white to-emerald-200/90 text-base font-medium text-neutral-900 shadow-[0_4px_32px_rgba(96,187,115,0.25)] transition-[filter] hover:brightness-105 hover:from-white hover:via-white hover:to-emerald-200/90"
          >
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

      <p className="text-center text-sm text-muted-foreground">
        RenAI is invite-only. Need access? Ask your company admin.
      </p>
    </div>
  )
}
