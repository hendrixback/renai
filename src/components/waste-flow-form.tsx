"use client"

import Link from "next/link"
import * as React from "react"
import { useActionState } from "react"
import { Loader2 } from "lucide-react"

import {
  CATEGORY_CHAPTERS,
  FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
  TREATMENT_OPTIONS,
  UNIT_OPTIONS,
} from "@/lib/waste-flows"
import {
  createWasteFlow,
  updateWasteFlow,
  type CreateWasteFlowState,
} from "@/app/(app)/waste-flows/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SelectClearButton } from "@/components/ui/select-clear"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  WasteCodeCombobox,
  type WasteCodeOption,
} from "@/components/waste-code-combobox"

type Option = { value: string; label: string }
type Category = { id: string; slug: string; name: string }
type Site = { id: string; name: string }

/**
 * Values to prepopulate the form with. Used in edit mode so the user sees
 * the record's current state and can change only the fields they care about.
 */
export type WasteFlowFormInitial = {
  id: string
  name: string
  description: string | null
  materialComposition: string | null
  categoryId: string | null
  wasteCodeId: string | null
  status: string
  estimatedQuantity: string | null
  quantityUnit: string
  frequency: string
  siteId: string | null
  locationName: string | null
  storageMethod: string | null
  currentDestination: string | null
  currentOperator: string | null
  internalCode: string | null
  treatmentCode: string | null
  treatmentNotes: string | null
  recoveryNotes: string | null
  notes: string | null
  isHazardous: boolean
  isPriority: boolean
}

const initial: CreateWasteFlowState = { error: null, fieldErrors: {} }

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {errors[0]}
    </p>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="gap-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  )
}

function OptionsSelect({
  name,
  defaultValue,
  placeholder,
  options,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  options: readonly Option[] | Option[]
}) {
  const resolveLabel = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v

  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {(raw) => {
            const v = typeof raw === "string" ? raw : ""
            if (!v) {
              return (
                <span className="text-muted-foreground">
                  {placeholder ?? "Select…"}
                </span>
              )
            }
            return resolveLabel(v)
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ClearableOptionsSelect({
  name,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  name: string
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: readonly Option[] | Option[]
}) {
  const resolveLabel = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v

  return (
    <div className="relative">
      <Select
        name={name}
        value={value}
        onValueChange={(v) => onValueChange(v ? String(v) : "")}
      >
        <SelectTrigger className={value ? "w-full pr-14" : "w-full"}>
          <SelectValue>
            {(raw) => {
              const v = typeof raw === "string" ? raw : ""
              if (!v) {
                return (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              }
              return resolveLabel(v)
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SelectClearButton
        visible={!!value}
        onClear={() => onValueChange("")}
        label={`Clear ${placeholder.toLowerCase()}`}
      />
    </div>
  )
}

export function WasteFlowForm({
  categories,
  wasteCodes,
  sites,
  initialValues,
}: {
  categories: Category[]
  wasteCodes: WasteCodeOption[]
  sites: Site[]
  /** Populate from an existing record to switch the form into edit mode. */
  initialValues?: WasteFlowFormInitial
}) {
  const isEdit = !!initialValues

  const [state, formAction, isPending] = useActionState(
    isEdit ? updateWasteFlow : createWasteFlow,
    initial,
  )

  const [categoryId, setCategoryId] = React.useState<string>(
    initialValues?.categoryId ?? "",
  )
  const [siteId, setSiteId] = React.useState<string>(
    initialValues?.siteId ?? "",
  )
  const [treatmentCode, setTreatmentCode] = React.useState<string>(
    initialValues?.treatmentCode ?? "",
  )

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const restrictToChapters = selectedCategory
    ? CATEGORY_CHAPTERS[selectedCategory.slug]
    : undefined

  const cancelHref = isEdit
    ? `/waste-flows/${initialValues.id}`
    : "/waste-flows"

  return (
    <form action={formAction} className="flex flex-col gap-6 p-4 pt-0">
      {isEdit ? (
        <input type="hidden" name="id" value={initialValues.id} />
      ) : null}

      {/* General Information */}
      <SectionCard title="General Information">
        <Field>
          <FieldLabel htmlFor="name">Waste Flow Name *</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Mixed textile scraps"
            required
            maxLength={200}
            autoFocus={!isEdit}
            defaultValue={initialValues?.name}
          />
          <FieldError errors={state.fieldErrors.name} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="categoryId">Category</FieldLabel>
            <div className="relative">
              <Select
                name="categoryId"
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ? String(v) : "")}
              >
                <SelectTrigger
                  id="categoryId"
                  className={categoryId ? "w-full pr-14" : "w-full"}
                >
                  <SelectValue>
                    {(raw) => {
                      const v = typeof raw === "string" ? raw : ""
                      if (!v) {
                        return (
                          <span className="text-muted-foreground">
                            Select category
                          </span>
                        )
                      }
                      return (
                        categories.find((c) => c.id === v)?.name ?? v
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SelectClearButton
                visible={!!categoryId}
                onClear={() => setCategoryId("")}
                label="Clear category"
              />
            </div>
            <FieldDescription>
              Filters the LoW / EWC code picker below.
            </FieldDescription>
            <FieldError errors={state.fieldErrors.categoryId} />
          </Field>

          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <OptionsSelect
              name="status"
              defaultValue={initialValues?.status ?? "ACTIVE"}
              options={STATUS_OPTIONS}
            />
            <FieldError errors={state.fieldErrors.status} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="wasteCodeId">Waste Code (LoW / EWC)</FieldLabel>
          <WasteCodeCombobox
            codes={wasteCodes}
            name="wasteCodeId"
            restrictToChapters={restrictToChapters}
            defaultValue={initialValues?.wasteCodeId ?? undefined}
          />
          <FieldDescription>
            Commission Decision 2014/955/EU. Hazardous codes auto-mark the flow
            as hazardous.
          </FieldDescription>
          <FieldError errors={state.fieldErrors.wasteCodeId} />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initialValues?.description ?? undefined}
          />
          <FieldError errors={state.fieldErrors.description} />
        </Field>

        <Field>
          <FieldLabel htmlFor="materialComposition">
            Material Composition
          </FieldLabel>
          <Input
            id="materialComposition"
            name="materialComposition"
            placeholder="e.g. 80% PET, 20% HDPE"
            defaultValue={initialValues?.materialComposition ?? undefined}
          />
          <FieldError errors={state.fieldErrors.materialComposition} />
        </Field>
      </SectionCard>

      {/* Quantities & Frequency */}
      <SectionCard title="Quantities & Frequency">
        <div className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="estimatedQuantity">
              Estimated Quantity
            </FieldLabel>
            <Input
              id="estimatedQuantity"
              name="estimatedQuantity"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              defaultValue={initialValues?.estimatedQuantity ?? undefined}
            />
            <FieldError errors={state.fieldErrors.estimatedQuantity} />
          </Field>
          <Field>
            <FieldLabel htmlFor="quantityUnit">Unit</FieldLabel>
            <OptionsSelect
              name="quantityUnit"
              defaultValue={initialValues?.quantityUnit ?? "TON"}
              options={UNIT_OPTIONS}
            />
            <FieldError errors={state.fieldErrors.quantityUnit} />
          </Field>
          <Field>
            <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
            <OptionsSelect
              name="frequency"
              defaultValue={initialValues?.frequency ?? "MONTHLY"}
              options={FREQUENCY_OPTIONS}
            />
            <FieldError errors={state.fieldErrors.frequency} />
          </Field>
        </div>
      </SectionCard>

      {/* Operations */}
      <SectionCard title="Operations">
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="storageMethod">
              Current Storage Method
            </FieldLabel>
            <Input
              id="storageMethod"
              name="storageMethod"
              defaultValue={initialValues?.storageMethod ?? undefined}
            />
            <FieldError errors={state.fieldErrors.storageMethod} />
          </Field>
          <Field>
            <FieldLabel htmlFor="currentDestination">
              Current Destination
            </FieldLabel>
            <Input
              id="currentDestination"
              name="currentDestination"
              defaultValue={initialValues?.currentDestination ?? undefined}
            />
            <FieldError errors={state.fieldErrors.currentDestination} />
          </Field>
          <Field>
            <FieldLabel htmlFor="currentOperator">Current Operator</FieldLabel>
            <Input
              id="currentOperator"
              name="currentOperator"
              defaultValue={initialValues?.currentOperator ?? undefined}
            />
            <FieldError errors={state.fieldErrors.currentOperator} />
          </Field>
          <Field>
            <FieldLabel htmlFor="siteId">Location / Plant</FieldLabel>
            {sites.length > 0 ? (
              <div className="relative">
                <Select
                  name="siteId"
                  value={siteId}
                  onValueChange={(v) => setSiteId(v ? String(v) : "")}
                >
                  <SelectTrigger
                    id="siteId"
                    className={siteId ? "w-full pr-14" : "w-full"}
                  >
                    <SelectValue>
                      {(raw) => {
                        const v = typeof raw === "string" ? raw : ""
                        if (!v) {
                          return (
                            <span className="text-muted-foreground">
                              Select a site
                            </span>
                          )
                        }
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
                <SelectClearButton
                  visible={!!siteId}
                  onClear={() => setSiteId("")}
                  label="Clear site"
                />
              </div>
            ) : (
              <Input
                name="locationName"
                placeholder="e.g. Main Plant"
                defaultValue={initialValues?.locationName ?? undefined}
              />
            )}
            <FieldError errors={state.fieldErrors.siteId} />
          </Field>
          <Field>
            <FieldLabel htmlFor="internalCode">Internal Code</FieldLabel>
            <Input
              id="internalCode"
              name="internalCode"
              placeholder="Optional"
              defaultValue={initialValues?.internalCode ?? undefined}
            />
            <FieldError errors={state.fieldErrors.internalCode} />
          </Field>
          <Field>
            <FieldLabel htmlFor="treatmentCode">Treatment Type</FieldLabel>
            <ClearableOptionsSelect
              name="treatmentCode"
              value={treatmentCode}
              onValueChange={setTreatmentCode}
              placeholder="Select R/D code"
              options={TREATMENT_OPTIONS}
            />
            <FieldDescription>
              Waste Framework Directive 2008/98/EC — Annex I (disposal) / II
              (recovery).
            </FieldDescription>
            <FieldError errors={state.fieldErrors.treatmentCode} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="treatmentNotes">Treatment Notes</FieldLabel>
          <Input
            id="treatmentNotes"
            name="treatmentNotes"
            defaultValue={initialValues?.treatmentNotes ?? undefined}
          />
          <FieldError errors={state.fieldErrors.treatmentNotes} />
        </Field>
      </SectionCard>

      {/* Additional */}
      <SectionCard title="Additional Information">
        <Field>
          <FieldLabel htmlFor="recoveryNotes">Recovery Potential Notes</FieldLabel>
          <Textarea
            id="recoveryNotes"
            name="recoveryNotes"
            rows={3}
            defaultValue={initialValues?.recoveryNotes ?? undefined}
          />
          <FieldError errors={state.fieldErrors.recoveryNotes} />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initialValues?.notes ?? undefined}
          />
          <FieldError errors={state.fieldErrors.notes} />
        </Field>

        <div className="flex flex-wrap gap-8 pt-2">
          <FieldLabel className="flex items-center gap-2">
            <Switch
              name="isHazardous"
              defaultChecked={initialValues?.isHazardous ?? false}
            />
            <span>Hazardous material</span>
          </FieldLabel>
          <FieldLabel className="flex items-center gap-2">
            <Switch
              name="isPriority"
              defaultChecked={initialValues?.isPriority ?? false}
            />
            <span>Mark as priority</span>
          </FieldLabel>
        </div>
      </SectionCard>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-xl border bg-background/80 p-3 backdrop-blur">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={cancelHref}>Cancel</Link>}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Create Waste Flow"
          )}
        </Button>
      </div>
    </form>
  )
}
