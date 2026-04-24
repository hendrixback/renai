"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { XIcon } from "lucide-react"

import {
  FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
  TREATMENT_OPTIONS,
} from "@/lib/waste-flows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SelectClearButton } from "@/components/ui/select-clear"
import { Switch } from "@/components/ui/switch"

type SiteOption = { id: string; name: string }
type CategoryOption = { slug: string; name: string }

// Sentinel used in the Select. Empty string doesn't work cleanly with
// base-ui; using "all" + a render-function on SelectValue gives us the
// best trigger label experience.
const ALL = "all"

function PlaceholderValue({
  allLabel,
  resolve,
}: {
  allLabel: string
  resolve: (value: string) => string | undefined
}) {
  return (
    <SelectValue>
      {(raw) => {
        const v = typeof raw === "string" ? raw : ""
        if (!v || v === ALL) {
          return <span className="text-muted-foreground">{allLabel}</span>
        }
        return resolve(v) ?? v
      }}
    </SelectValue>
  )
}


export function WasteFlowsFilters({
  categories,
  sites,
}: {
  categories: CategoryOption[]
  sites: SiteOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [q, setQ] = React.useState(params.get("q") ?? "")
  const [code, setCode] = React.useState(params.get("code") ?? "")

  const currentCategory = params.get("category") ?? ALL
  const currentStatus = params.get("status") ?? ALL
  const currentSite = params.get("site") ?? ALL
  const currentFrequency = params.get("frequency") ?? ALL
  const currentTreatment = params.get("treatment") ?? ALL
  const currentHaz = params.get("hazardous") === "true"
  const currentPri = params.get("priority") === "true"

  const hasFilters =
    q !== "" ||
    code !== "" ||
    currentCategory !== ALL ||
    currentStatus !== ALL ||
    currentSite !== ALL ||
    currentFrequency !== ALL ||
    currentTreatment !== ALL ||
    currentHaz ||
    currentPri

  const push = React.useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString())
      mutate(next)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const setParam = (key: string, value: string) =>
    push((next) => {
      if (!value || value === ALL) next.delete(key)
      else next.set(key, value)
    })

  const setBool = (key: string, value: boolean) =>
    push((next) => {
      if (value) next.set(key, "true")
      else next.delete(key)
    })

  // Debounce search input.
  React.useEffect(() => {
    const id = setTimeout(() => setParam("q", q.trim()), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Debounce LoW code input (text match can be partial, so same UX as search).
  React.useEffect(() => {
    const id = setTimeout(() => setParam("code", code.trim()), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const reset = () => {
    setQ("")
    setCode("")
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <Label htmlFor="q" className="text-xs">
          Search
        </Label>
        <Input
          id="q"
          placeholder="Name or description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Category</Label>
        <div className="relative">
          <Select
            value={currentCategory}
            onValueChange={(v) => setParam("category", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentCategory !== ALL
                  ? "min-w-[200px] pr-14"
                  : "min-w-[200px]"
              }
            >
              <PlaceholderValue
                allLabel="All categories"
                resolve={(v) => categories.find((c) => c.slug === v)?.name}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SelectClearButton
            visible={currentCategory !== ALL}
            onClear={() => setParam("category", "")}
            label="Clear category filter"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status</Label>
        <div className="relative">
          <Select
            value={currentStatus}
            onValueChange={(v) => setParam("status", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentStatus !== ALL
                  ? "min-w-[150px] pr-14"
                  : "min-w-[150px]"
              }
            >
              <PlaceholderValue
                allLabel="All statuses"
                resolve={(v) =>
                  STATUS_OPTIONS.find((o) => o.value === v)?.label
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SelectClearButton
            visible={currentStatus !== ALL}
            onClear={() => setParam("status", "")}
            label="Clear status filter"
          />
        </div>
      </div>

      {sites.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Site</Label>
          <div className="relative">
            <Select
              value={currentSite}
              onValueChange={(v) => setParam("site", String(v ?? ""))}
            >
              <SelectTrigger
                className={
                  currentSite !== ALL
                    ? "min-w-[170px] pr-14"
                    : "min-w-[170px]"
                }
              >
                <PlaceholderValue
                  allLabel="All sites"
                  resolve={(v) => sites.find((s) => s.id === v)?.name}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SelectClearButton
              visible={currentSite !== ALL}
              onClear={() => setParam("site", "")}
              label="Clear site filter"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Frequency</Label>
        <div className="relative">
          <Select
            value={currentFrequency}
            onValueChange={(v) => setParam("frequency", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentFrequency !== ALL
                  ? "min-w-[140px] pr-14"
                  : "min-w-[140px]"
              }
            >
              <PlaceholderValue
                allLabel="All frequencies"
                resolve={(v) =>
                  FREQUENCY_OPTIONS.find((o) => o.value === v)?.label
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All frequencies</SelectItem>
              {FREQUENCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SelectClearButton
            visible={currentFrequency !== ALL}
            onClear={() => setParam("frequency", "")}
            label="Clear frequency filter"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Treatment</Label>
        <div className="relative">
          <Select
            value={currentTreatment}
            onValueChange={(v) => setParam("treatment", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentTreatment !== ALL
                  ? "min-w-[170px] pr-14"
                  : "min-w-[170px]"
              }
            >
              <PlaceholderValue
                allLabel="All treatments"
                resolve={(v) =>
                  TREATMENT_OPTIONS.find((o) => o.value === v)?.label
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All treatments</SelectItem>
              {TREATMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SelectClearButton
            visible={currentTreatment !== ALL}
            onClear={() => setParam("treatment", "")}
            label="Clear treatment filter"
          />
        </div>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1.5">
        <Label htmlFor="code" className="text-xs">
          LoW code
        </Label>
        <Input
          id="code"
          placeholder="e.g. 15 01 01"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Hazardous</Label>
        <Label className="flex h-8 items-center gap-2 rounded-lg border bg-transparent px-3">
          <Switch
            checked={currentHaz}
            onCheckedChange={(v) => setBool("hazardous", !!v)}
          />
          <span className="text-sm">Only</span>
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Priority</Label>
        <Label className="flex h-8 items-center gap-2 rounded-lg border bg-transparent px-3">
          <Switch
            checked={currentPri}
            onCheckedChange={(v) => setBool("priority", !!v)}
          />
          <span className="text-sm">Only</span>
        </Label>
      </div>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={reset}>
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
