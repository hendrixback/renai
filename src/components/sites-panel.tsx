"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState, useTransition } from "react"
import { Loader2, PencilIcon, PlusIcon, XIcon } from "lucide-react"

import {
  createSite,
  deleteSite,
  updateSite,
  type SiteFormState,
} from "@/app/(app)/settings/sites/actions"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Site = {
  id: string
  name: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  country: string | null
  postalCode: string | null
  createdAt: string
}

const initial: SiteFormState = { error: null, success: null, fieldErrors: {} }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive">{errors[0]}</p>
}

function formatAddress(s: Site): string {
  const parts = [
    [s.addressLine1, s.addressLine2].filter(Boolean).join(", "),
    [s.postalCode, s.city].filter(Boolean).join(" "),
    [s.region, s.country].filter(Boolean).join(", "),
  ].filter((p) => p.length > 0)
  return parts.join(" · ") || "—"
}

function EditSiteDialog({ site }: { site: Site }) {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<SiteFormState>(initial)
  const [pending, startTransition] = useTransition()

  const [name, setName] = React.useState(site.name)
  const [addressLine1, setAddressLine1] = React.useState(site.addressLine1 ?? "")
  const [addressLine2, setAddressLine2] = React.useState(site.addressLine2 ?? "")
  const [city, setCity] = React.useState(site.city ?? "")
  const [region, setRegion] = React.useState(site.region ?? "")
  const [country, setCountry] = React.useState(site.country ?? "")
  const [postalCode, setPostalCode] = React.useState(site.postalCode ?? "")

  function reset() {
    setName(site.name)
    setAddressLine1(site.addressLine1 ?? "")
    setAddressLine2(site.addressLine2 ?? "")
    setCity(site.city ?? "")
    setRegion(site.region ?? "")
    setCountry(site.country ?? "")
    setPostalCode(site.postalCode ?? "")
    setState(initial)
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateSite({
        id: site.id,
        name,
        addressLine1,
        addressLine2,
        city,
        region,
        country,
        postalCode,
      })
      setState(result)
      if (result.success) {
        setTimeout(() => setOpen(false), 400)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${site.name}`}
          />
        }
      >
        <PencilIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit site</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`name-${site.id}`}>Name</FieldLabel>
            <Input
              id={`name-${site.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lisbon Plant"
            />
            <FieldError errors={state.fieldErrors.name} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`addressLine1-${site.id}`}>Address line 1</FieldLabel>
            <Input
              id={`addressLine1-${site.id}`}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Rua do Exemplo 123"
            />
            <FieldError errors={state.fieldErrors.addressLine1} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`addressLine2-${site.id}`}>Address line 2</FieldLabel>
            <Input
              id={`addressLine2-${site.id}`}
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Optional"
            />
            <FieldError errors={state.fieldErrors.addressLine2} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`postalCode-${site.id}`}>Postal code</FieldLabel>
              <Input
                id={`postalCode-${site.id}`}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1000-001"
              />
              <FieldError errors={state.fieldErrors.postalCode} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`city-${site.id}`}>City</FieldLabel>
              <Input
                id={`city-${site.id}`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lisboa"
              />
              <FieldError errors={state.fieldErrors.city} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`region-${site.id}`}>Region / state</FieldLabel>
              <Input
                id={`region-${site.id}`}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Optional"
              />
              <FieldError errors={state.fieldErrors.region} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`country-${site.id}`}>Country (ISO)</FieldLabel>
              <Input
                id={`country-${site.id}`}
                maxLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="PT"
              />
              <FieldError errors={state.fieldErrors.country} />
            </Field>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
        </FieldGroup>

        <DialogFooter className="mt-6">
          <DialogClose render={<Button variant="outline" disabled={pending}>Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteSiteButton({ site }: { site: Site }) {
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
            aria-label={`Delete ${site.name}`}
          />
        }
      >
        <XIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete site</DialogTitle>
          <DialogDescription>
            Delete <span className="font-medium text-foreground">{site.name}</span>?
            Fuel, electricity and waste entries linked to this site stay, but will
            no longer be associated with it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await deleteSite(site.id)
                setOpen(false)
              })
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SitesPanel({
  canManage,
  sites,
}: {
  canManage: boolean
  sites: Site[]
}) {
  const [state, formAction, isPending] = useActionState(createSite, initial)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state.success])

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a site</CardTitle>
            <CardDescription>
              Plants, offices, warehouses — any physical location whose emissions
              or waste you want to track separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={formAction}>
              <FieldGroup>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Lisbon Plant"
                    />
                    <FieldError errors={state.fieldErrors.name} />
                  </Field>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Adding…
                        </>
                      ) : (
                        <>
                          <PlusIcon className="size-4" />
                          Add site
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="addressLine1">Address line 1</FieldLabel>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      placeholder="Rua do Exemplo 123"
                    />
                    <FieldError errors={state.fieldErrors.addressLine1} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="addressLine2">Address line 2</FieldLabel>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      placeholder="Optional"
                    />
                    <FieldError errors={state.fieldErrors.addressLine2} />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
                    <Input id="postalCode" name="postalCode" placeholder="1000-001" />
                    <FieldError errors={state.fieldErrors.postalCode} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input id="city" name="city" placeholder="Lisboa" />
                    <FieldError errors={state.fieldErrors.city} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="region">Region / state</FieldLabel>
                    <Input id="region" name="region" placeholder="Optional" />
                    <FieldError errors={state.fieldErrors.region} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="country">Country (ISO)</FieldLabel>
                    <Input
                      id="country"
                      name="country"
                      maxLength={2}
                      placeholder="PT"
                    />
                    <FieldError errors={state.fieldErrors.country} />
                  </Field>
                </div>

                {state.error ? (
                  <p className="text-sm text-destructive">{state.error}</p>
                ) : null}
                {state.success ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {state.success}
                  </p>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 overflow-hidden">
        <CardHeader>
          <CardTitle>
            Sites
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {sites.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sites.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No sites yet.
              {canManage ? " Add one above." : " An owner or admin can add sites."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Added</TableHead>
                  {canManage ? <TableHead className="w-[90px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/settings/sites/${s.id}`}
                        className="hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatAddress(s)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <EditSiteDialog site={s} />
                          <DeleteSiteButton site={s} />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
