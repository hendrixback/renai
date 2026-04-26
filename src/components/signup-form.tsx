"use client"

import { useActionState, useState } from "react"
import { Loader2 } from "lucide-react"

import { signup, type SignupState } from "@/app/signup/actions"
import { PasswordRequirements } from "@/components/password-requirements"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy"

const initial: SignupState = { error: null, fieldErrors: {} }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {errors[0]}
    </p>
  )
}

export function SignupForm({
  token,
  email,
  existingUserName,
}: {
  token: string
  email: string
  existingUserName: string | null
}) {
  const [state, formAction, isPending] = useActionState(signup, initial)
  const [password, setPassword] = useState("")

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={email} disabled readOnly />
          <FieldDescription>
            This invite was sent to this address.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={existingUserName ?? ""}
            autoFocus
          />
          <FieldError errors={state.fieldErrors.name} />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {existingUserName ? (
            <FieldDescription>
              You already have a renai account — if so, just use your
              existing password to log in after accepting.
            </FieldDescription>
          ) : (
            <PasswordRequirements value={password} />
          )}
          <FieldError errors={state.fieldErrors.password} />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
          <FieldError errors={state.fieldErrors.confirmPassword} />
        </Field>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Accept invite & sign in"
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}
