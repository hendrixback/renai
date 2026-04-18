"use client"

import { useActionState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

import {
  changePassword,
  updateProfile,
  type AccountState,
} from "@/app/(app)/settings/account/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initial: AccountState = { error: null, success: null, fieldErrors: {} }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {errors[0]}
    </p>
  )
}

export function AccountForms({
  user,
}: {
  user: { name: string; email: string }
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    initial,
  )
  const [pwState, pwAction, pwPending] = useActionState(
    changePassword,
    initial,
  )
  const pwFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (pwState.success && pwFormRef.current) {
      pwFormRef.current.reset()
    }
  }, [pwState.success])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your personal info — visible to teammates in your company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="max-w-md">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" value={user.email} disabled />
                <FieldDescription>
                  Contact support to change your email.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name}
                  required
                  maxLength={120}
                />
                <FieldError errors={profileState.fieldErrors.name} />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={profilePending}>
                  {profilePending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save profile"
                  )}
                </Button>
                {profileState.success ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {profileState.success}
                  </p>
                ) : null}
                {profileState.error ? (
                  <p className="text-sm text-destructive">{profileState.error}</p>
                ) : null}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Use at least 8 characters. Rotate this if you suspect your
            account has been compromised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={pwFormRef} action={pwAction} className="max-w-md">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">
                  Current password
                </FieldLabel>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <FieldError errors={pwState.fieldErrors.currentPassword} />
              </Field>
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <FieldError errors={pwState.fieldErrors.newPassword} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <FieldError errors={pwState.fieldErrors.confirmPassword} />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pwPending}>
                  {pwPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Changing…
                    </>
                  ) : (
                    "Change password"
                  )}
                </Button>
                {pwState.success ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {pwState.success}
                  </p>
                ) : null}
                {pwState.error ? (
                  <p className="text-sm text-destructive">{pwState.error}</p>
                ) : null}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
