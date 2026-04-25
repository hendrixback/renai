"use client"

import * as React from "react"
import { useActionState, useTransition } from "react"
import { AlertTriangleIcon, CheckIcon, CopyIcon, Loader2, XIcon } from "lucide-react"

import {
  inviteTeammate,
  removeMember,
  revokeInvitation,
  type TeamState,
} from "@/app/(app)/settings/team/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Member = {
  id: string
  userId: string
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  name: string | null
  email: string
  createdAt: string
}

type Invitation = {
  id: string
  email: string
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  expiresAt: string
  /** Latest terminal delivery event from Resend (bounce / spam
   *  complaint). null = no failure event seen — the message is
   *  presumed delivered. */
  deliveryStatus?: {
    kind: "BOUNCED" | "COMPLAINED"
    reason: string | null
  } | null
}

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
  { value: "VIEWER", label: "Viewer" },
]

const initial: TeamState = {
  error: null,
  success: null,
  inviteUrl: null,
  fieldErrors: {},
}

function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "OWNER"
      ? "default"
      : role === "ADMIN"
        ? "secondary"
        : "outline"
  return <Badge variant={variant}>{role.toLowerCase()}</Badge>
}

function RemoveMemberButton({ memberId, email }: { memberId: string; email: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove member"
          />
        }
      >
        <XIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove team member</DialogTitle>
          <DialogDescription>
            Remove <span className="font-medium text-foreground">{email}</span> from
            the team? They will lose access immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await removeMember(memberId)
                setOpen(false)
              })
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Removing…
              </>
            ) : (
              "Remove"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RevokeInvitationButton({ invitationId, email }: { invitationId: string; email: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Revoke invitation"
          />
        }
      >
        <XIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke invitation</DialogTitle>
          <DialogDescription>
            Revoke the invite for{" "}
            <span className="font-medium text-foreground">{email}</span>? The
            invite link will no longer work.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await revokeInvitation(invitationId)
                setOpen(false)
              })
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Revoking…
              </>
            ) : (
              "Revoke"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteUrlBlock({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Invite link — sent by email; copy this as a fallback if the message
        doesn&apos;t arrive.
      </p>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={url}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
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
    </div>
  )
}

export function TeamPanel({
  canManage,
  isOwner,
  currentUserId,
  members,
  invitations,
}: {
  canManage: boolean
  isOwner: boolean
  currentUserId: string
  members: Member[]
  invitations: Invitation[]
}) {
  const [state, formAction, isPending] = useActionState(
    inviteTeammate,
    initial,
  )
  const [role, setRole] = React.useState<string>("MEMBER")
  const formRef = React.useRef<HTMLFormElement>(null)

  // Track which action result the user has seen. The banner shows
  // when the current `state` isn't the one tagged as "dismissed".
  // - User clicks ×        → setDismissedState(state)
  // - New form submission  → state becomes a fresh object → banner re-shows
  // - Invitation list changes (revoke/re-invite triggered a revalidate) →
  //   "previous prop in state" pattern detects it during render and
  //   auto-dismisses the now-stale banner.
  const [dismissedState, setDismissedState] = React.useState<TeamState | null>(
    null,
  )
  const invitationsKey = invitations.map((i) => i.id).join(",")
  const [previousInvitationsKey, setPreviousInvitationsKey] =
    React.useState(invitationsKey)

  if (previousInvitationsKey !== invitationsKey) {
    setPreviousInvitationsKey(invitationsKey)
    setDismissedState(state)
  }

  React.useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
      setRole("MEMBER")
    }
  }, [state.success])

  const showBanner =
    state !== dismissedState &&
    (state.success || state.error || state.inviteUrl)

  const roleOptions = isOwner
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => r.value !== "OWNER")

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Create an invite link — valid for 7 days. The recipient
              completes their account at `/signup`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={formAction}>
              <FieldGroup>
                <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="teammate@company.com"
                    />
                    {state.fieldErrors.email ? (
                      <p className="text-sm text-destructive">
                        {state.fieldErrors.email[0]}
                      </p>
                    ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="role">Role</FieldLabel>
                    <Select
                      name="role"
                      value={role}
                      onValueChange={(v) => setRole(String(v ?? "MEMBER"))}
                    >
                      <SelectTrigger id="role">
                        <SelectValue>
                          {(raw) =>
                            roleOptions.find(
                              (o) => o.value === (raw as string),
                            )?.label ?? "Select role"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {state.fieldErrors.role ? (
                      <p className="text-sm text-destructive">
                        {state.fieldErrors.role[0]}
                      </p>
                    ) : null}
                  </Field>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Create invite"
                      )}
                    </Button>
                  </div>
                </div>
                {showBanner ? (
                  <div className="relative">
                    {state.error ? (
                      <p className="pr-7 text-sm text-destructive">
                        {state.error}
                      </p>
                    ) : null}
                    {state.success ? (
                      <p className="pr-7 text-sm text-emerald-600 dark:text-emerald-400">
                        {state.success}
                      </p>
                    ) : null}
                    {state.inviteUrl ? (
                      <InviteUrlBlock url={state.inviteUrl} />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setDismissedState(state)}
                      aria-label="Dismiss"
                      className="absolute right-0 top-0 rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 overflow-hidden">
        <CardHeader>
          <CardTitle>
            Members
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {members.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManage ? <TableHead className="w-[60px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.userId === currentUserId
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.name ?? "—"}
                      {isSelf ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={m.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {!isSelf ? (
                          <RemoveMemberButton memberId={m.id} email={m.email} />
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card className="gap-0 overflow-hidden">
          <CardHeader>
            <CardTitle>
              Pending invitations
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {invitations.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  {canManage ? <TableHead className="w-[60px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">
                      <div>{i.email}</div>
                      {i.deliveryStatus ? (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangleIcon className="size-3" />
                          {i.deliveryStatus.kind === "BOUNCED"
                            ? "Email bounced"
                            : "Reported as spam"}
                          {i.deliveryStatus.reason ? (
                            <span
                              className="text-muted-foreground"
                              title={i.deliveryStatus.reason}
                            >
                              — {i.deliveryStatus.reason.slice(0, 60)}
                              {i.deliveryStatus.reason.length > 60 ? "…" : ""}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={i.role} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <RevokeInvitationButton invitationId={i.id} email={i.email} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
