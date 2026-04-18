"use client"

import * as React from "react"
import { useActionState } from "react"
import { Loader2, PlusIcon } from "lucide-react"

import {
  registerFuelEntry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/actions"
import { FUEL_TYPES, FUEL_UNIT_OPTIONS, REGIONS } from "@/lib/carbon-options"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
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

type Site = { id: string; name: string }

const initial: SimpleState = { error: null, success: null, fieldErrors: {} }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive">{errors[0]}</p>
}

export function RegisterFuelDialog({ sites }: { sites: Site[] }) {
  const [open, setOpen] = React.useState(false)
  const [state, action, pending] = useActionState(registerFuelEntry, initial)

  const [fuelType, setFuelType] = React.useState<string>("diesel")
  const [unit, setUnit] = React.useState<string>("L")
  const [region, setRegion] = React.useState<string>("GLOBAL")
  const [siteId, setSiteId] = React.useState<string>("")

  // When picking a fuel type, auto-select its typical unit
  React.useEffect(() => {
    const match = FUEL_TYPES.find((f) => f.value === fuelType)
    if (match) setUnit(match.unit)
  }, [fuelType])

  // Close on success
  React.useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => setOpen(false), 400)
      return () => clearTimeout(t)
    }
  }, [state.success])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="size-4" />
            Register Fuel
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Fuel</DialogTitle>
        </DialogHeader>
        <form action={action}>
          {/* Explicit hidden inputs mirror the controlled Select state —
              base-ui's internal hidden-input doesn't always fire inside
              a portaled Dialog, so we set them ourselves to be safe. */}
          <input type="hidden" name="fuelType" value={fuelType} />
          <input type="hidden" name="unit" value={unit} />
          <input type="hidden" name="region" value={region} />
          <input type="hidden" name="siteId" value={siteId} />
          <FieldGroup>
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fuelType">Fuel Type</FieldLabel>
                <Select value={fuelType} onValueChange={(v) => setFuelType(String(v ?? ""))}>
                  <SelectTrigger id="fuelType">
                    <SelectValue>
                      {(raw) =>
                        FUEL_TYPES.find((f) => f.value === (raw as string))?.label ?? "Select"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={state.fieldErrors.fuelType} />
              </Field>
              <Field>
                <FieldLabel htmlFor="unit">Unit</FieldLabel>
                <Select value={unit} onValueChange={(v) => setUnit(String(v ?? ""))}>
                  <SelectTrigger id="unit">
                    <SelectValue>
                      {(raw) =>
                        FUEL_UNIT_OPTIONS.find((u) => u.value === (raw as string))?.label ?? "Unit"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={state.fieldErrors.unit} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="0"
              />
              <FieldError errors={state.fieldErrors.quantity} />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="month">Month</FieldLabel>
                <Input id="month" name="month" type="month" required />
                <FieldError errors={state.fieldErrors.month} />
              </Field>
              <Field>
                <FieldLabel htmlFor="region">Emission Factor Region</FieldLabel>
                <Select value={region} onValueChange={(v) => setRegion(String(v ?? "GLOBAL"))}>
                  <SelectTrigger id="region">
                    <SelectValue>
                      {(raw) =>
                        REGIONS.find((r) => r.value === (raw as string))?.label ?? "Region"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="siteId">Plant / Location</FieldLabel>
                {sites.length > 0 ? (
                  <Select value={siteId} onValueChange={(v) => setSiteId(String(v ?? ""))}>
                    <SelectTrigger id="siteId">
                      <SelectValue>
                        {(raw) => {
                          const v = (raw as string) || ""
                          if (!v) return <span className="text-muted-foreground">Select site</span>
                          return sites.find((s) => s.id === v)?.name ?? v
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input name="locationName" placeholder="Plant..." />
                )}
                <FieldError errors={state.fieldErrors.siteId} />
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Input id="notes" name="notes" placeholder="Optional" />
              </Field>
            </div>

            {state.success ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ✓ {state.success}
              </p>
            ) : null}
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" disabled={pending}>Cancel</Button>} />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
