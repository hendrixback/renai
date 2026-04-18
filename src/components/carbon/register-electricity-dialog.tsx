"use client"

import * as React from "react"
import { useActionState } from "react"
import { Loader2, PlusIcon } from "lucide-react"

import {
  registerElectricityEntry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/actions"
import { REGIONS } from "@/lib/carbon-options"
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

export function RegisterElectricityDialog({ sites }: { sites: Site[] }) {
  const [open, setOpen] = React.useState(false)
  const [state, action, pending] = useActionState(
    registerElectricityEntry,
    initial,
  )
  const [region, setRegion] = React.useState<string>("EU")
  const [siteId, setSiteId] = React.useState<string>("")

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
            Register Electricity
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Electricity</DialogTitle>
        </DialogHeader>
        <form action={action}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="kwh">kWh</FieldLabel>
              <Input
                id="kwh"
                name="kwh"
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="0"
              />
              <FieldError errors={state.fieldErrors.kwh} />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="month">Month</FieldLabel>
                <Input id="month" name="month" type="month" required />
                <FieldError errors={state.fieldErrors.month} />
              </Field>
              <Field>
                <FieldLabel htmlFor="renewablePercent">Renewable %</FieldLabel>
                <Input
                  id="renewablePercent"
                  name="renewablePercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                />
                <FieldError errors={state.fieldErrors.renewablePercent} />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="energyProvider">Energy Provider</FieldLabel>
                <Input
                  id="energyProvider"
                  name="energyProvider"
                  placeholder="EDP, Galp..."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="region">Grid Region</FieldLabel>
                <Select
                  name="region"
                  value={region}
                  onValueChange={(v) => setRegion(String(v ?? "EU"))}
                >
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
                  <Select name="siteId" value={siteId} onValueChange={(v) => setSiteId(String(v ?? ""))}>
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
