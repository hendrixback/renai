"use client"

import { useState, useTransition } from "react"
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

type Site = { id: string; name: string }

const emptyState: SimpleState = { error: null, success: null, fieldErrors: {} }

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive">{errors[0]}</p>
}

export function RegisterElectricityDialog({ sites }: { sites: Site[] }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<SimpleState>(emptyState)
  const [pending, startTransition] = useTransition()

  const [kwh, setKwh] = useState("")
  const [month, setMonth] = useState("")
  const [renewablePercent, setRenewablePercent] = useState("")
  const [energyProvider, setEnergyProvider] = useState("")
  const [region, setRegion] = useState("EU")
  const [siteId, setSiteId] = useState("")
  const [locationName, setLocationName] = useState("")
  const [notes, setNotes] = useState("")

  function resetForm() {
    setKwh("")
    setMonth("")
    setRenewablePercent("")
    setEnergyProvider("")
    setRegion("EU")
    setSiteId("")
    setLocationName("")
    setNotes("")
    setState(emptyState)
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await registerElectricityEntry({
        kwh,
        month,
        renewablePercent,
        energyProvider,
        region,
        siteId,
        locationName,
        notes,
      })
      setState(result)
      if (result.success) {
        setTimeout(() => {
          resetForm()
          setOpen(false)
        }, 400)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) resetForm()
      }}
    >
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

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="kwh">kWh</FieldLabel>
            <Input
              id="kwh"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              value={kwh}
              onChange={(e) => setKwh(e.target.value)}
            />
            <FieldError errors={state.fieldErrors.kwh} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="month">Month</FieldLabel>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.month} />
            </Field>
            <Field>
              <FieldLabel htmlFor="renewablePercent">Renewable %</FieldLabel>
              <Input
                id="renewablePercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={renewablePercent}
                onChange={(e) => setRenewablePercent(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.renewablePercent} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="energyProvider">Energy Provider</FieldLabel>
              <Input
                id="energyProvider"
                placeholder="EDP, Galp..."
                value={energyProvider}
                onChange={(e) => setEnergyProvider(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="region">Grid Region</FieldLabel>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={selectClass}
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="siteId">Plant / Location</FieldLabel>
              {sites.length > 0 ? (
                <select
                  id="siteId"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  placeholder="Plant..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              )}
              <FieldError errors={state.fieldErrors.siteId} />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Input
                id="notes"
                placeholder="Optional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </FieldGroup>

        <DialogFooter className="mt-6">
          <DialogClose render={<Button variant="outline" disabled={pending}>Cancel</Button>} />
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
