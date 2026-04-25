"use client"

import { useState, useTransition } from "react"
import { Loader2, PlusIcon } from "lucide-react"

import {
  registerFuelEntry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/actions"
import {
  EMISSION_SOURCE_TYPES,
  FUEL_TYPES,
  FUEL_UNIT_OPTIONS,
  REGIONS,
} from "@/lib/carbon-options"
import type { FuelFactorOption } from "@/lib/fuel-factor-preview"
import { Button } from "@/components/ui/button"
import { FuelFactorPreview } from "@/components/carbon/fuel-factor-preview"
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

export function RegisterFuelDialog({
  sites,
  factors = [],
  companyId = "",
}: {
  sites: Site[]
  factors?: FuelFactorOption[]
  companyId?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<SimpleState>(emptyState)
  const [pending, startTransition] = useTransition()

  const [fuelType, setFuelType] = useState("diesel")
  const [emissionSourceType, setEmissionSourceType] = useState("")
  const [unit, setUnit] = useState("L")
  const [quantity, setQuantity] = useState("")
  const [month, setMonth] = useState("")
  const [region, setRegion] = useState("GLOBAL")
  const [siteId, setSiteId] = useState("")
  const [locationName, setLocationName] = useState("")
  const [notes, setNotes] = useState("")

  function resetForm() {
    setFuelType("diesel")
    setEmissionSourceType("")
    setUnit("L")
    setQuantity("")
    setMonth("")
    setRegion("GLOBAL")
    setSiteId("")
    setLocationName("")
    setNotes("")
    setState(emptyState)
  }

  function changeFuelType(value: string) {
    setFuelType(value)
    const match = FUEL_TYPES.find((f) => f.value === value)
    if (match) setUnit(match.unit)
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await registerFuelEntry({
        fuelType,
        emissionSourceType,
        unit,
        quantity,
        month,
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
            Register Fuel
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Fuel</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fuelType">Fuel Type</FieldLabel>
              <select
                id="fuelType"
                value={fuelType}
                onChange={(e) => changeFuelType(e.target.value)}
                className={selectClass}
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors.fuelType} />
            </Field>
            <Field>
              <FieldLabel htmlFor="unit">Unit</FieldLabel>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={selectClass}
              >
                {FUEL_UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors.unit} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="emissionSourceType">
              Emission source type
            </FieldLabel>
            <select
              id="emissionSourceType"
              value={emissionSourceType}
              onChange={(e) => setEmissionSourceType(e.target.value)}
              className={selectClass}
            >
              <option value="">— Not specified —</option>
              {EMISSION_SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors.emissionSourceType} />
          </Field>

          <Field>
            <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <FieldError errors={state.fieldErrors.quantity} />
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
              <FieldLabel htmlFor="region">Emission Factor Region</FieldLabel>
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

          {factors.length > 0 ? (
            <FuelFactorPreview
              factors={factors}
              fuelType={fuelType}
              region={region}
              companyId={companyId}
            />
          ) : null}

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
                  id="locationName"
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
