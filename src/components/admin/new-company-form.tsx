"use client"

import Link from "next/link"
import * as React from "react"
import { useActionState, useState } from "react"
import { CheckIcon, CopyIcon, Loader2 } from "lucide-react"

import {
  createCompanyAndInviteOwner,
  type AdminCreateCompanyState,
} from "@/app/admin/actions"
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

const initial: AdminCreateCompanyState = {
  error: null,
  fieldErrors: {},
  inviteUrl: null,
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {errors[0]}
    </p>
  )
}

export function NewCompanyForm() {
  const [state, action, pending] = useActionState(
    createCompanyAndInviteOwner,
    initial,
  )
  const [copied, setCopied] = useState(false)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to companies
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New company</CardTitle>
          <CardDescription>
            Creates a tenant and generates an invite link for the first
            owner. Share the link with them — they set their own password on
            signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Company name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  placeholder="Acme Industries"
                  autoFocus
                />
                <FieldError errors={state.fieldErrors.name} />
              </Field>

              <Field>
                <FieldLabel htmlFor="country">Country (ISO 2-letter)</FieldLabel>
                <Input
                  id="country"
                  name="country"
                  maxLength={2}
                  placeholder="PT"
                  className="uppercase"
                />
                <FieldDescription>
                  Optional. Used for regulatory scoping later.
                </FieldDescription>
                <FieldError errors={state.fieldErrors.country} />
              </Field>

              <Field>
                <FieldLabel htmlFor="ownerEmail">Owner email</FieldLabel>
                <Input
                  id="ownerEmail"
                  name="ownerEmail"
                  type="email"
                  required
                  placeholder="owner@acme.com"
                />
                <FieldDescription>
                  The person who gets the invite link and first OWNER role.
                </FieldDescription>
                <FieldError errors={state.fieldErrors.ownerEmail} />
              </Field>

              {state.error ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}

              <Button type="submit" disabled={pending} className="self-start">
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create company + invite owner"
                )}
              </Button>
            </FieldGroup>
          </form>

          {state.inviteUrl ? (
            <div className="mt-6 flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Company created. Invite link ready:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={state.inviteUrl}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (state.inviteUrl) {
                      navigator.clipboard.writeText(state.inviteUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }
                  }}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this link manually. Email delivery is on the roadmap.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
