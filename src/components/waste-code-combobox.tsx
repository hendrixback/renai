"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { CHAPTER_LABELS } from "@/lib/waste-flows"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type WasteCodeOption = {
  code: string
  displayCode: string
  description: string
  chapterCode: string
  isHazardous: boolean
}

export function WasteCodeCombobox({
  codes,
  name,
  defaultValue,
  restrictToChapters,
  onChange,
}: {
  codes: WasteCodeOption[]
  name: string
  defaultValue?: string
  restrictToChapters?: string[]
  onChange?: (code: WasteCodeOption | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string>(defaultValue ?? "")

  const filteredCodes = React.useMemo(() => {
    if (!restrictToChapters || restrictToChapters.length === 0) return codes
    const set = new Set(restrictToChapters)
    return codes.filter((c) => set.has(c.chapterCode))
  }, [codes, restrictToChapters])

  // Group by chapter for nicer scanning.
  const grouped = React.useMemo(() => {
    const map = new Map<string, WasteCodeOption[]>()
    for (const c of filteredCodes) {
      const bucket = map.get(c.chapterCode) ?? []
      bucket.push(c)
      map.set(c.chapterCode, bucket)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredCodes])

  const selected = codes.find((c) => c.code === value)

  React.useEffect(() => {
    if (onChange) onChange(selected ?? null)
  }, [selected, onChange])

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {selected ? (
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-xs tabular-nums">
                    {selected.displayCode}
                  </span>
                  <span className="truncate">{selected.description}</span>
                  {selected.isHazardous ? (
                    <Badge variant="destructive" className="ml-1 shrink-0">
                      Hazardous
                    </Badge>
                  ) : null}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Select a LoW / EWC code…
                </span>
              )}
              <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent
          className="w-[var(--anchor-width)] min-w-[380px] p-0"
          align="start"
        >
          <Command
            filter={(value, search) => {
              const haystack = value.toLowerCase()
              const needle = search.toLowerCase().replace(/\s/g, "")
              return haystack.includes(needle) ? 1 : 0
            }}
          >
            <CommandInput placeholder="Search by code or description…" />
            <CommandList>
              <CommandEmpty>No matching codes.</CommandEmpty>
              {value ? (
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      setValue("")
                      setOpen(false)
                    }}
                  >
                    <span className="text-muted-foreground">
                      Clear selection
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {grouped.map(([chapter, items]) => (
                <CommandGroup
                  key={chapter}
                  heading={CHAPTER_LABELS[chapter] ?? chapter}
                >
                  {items.map((c) => {
                    const searchKey = `${c.code} ${c.displayCode.replace(/\s/g, "")} ${c.description}`
                    return (
                      <CommandItem
                        key={c.code}
                        value={searchKey}
                        data-checked={value === c.code}
                        onSelect={() => {
                          setValue(c.code === value ? "" : c.code)
                          setOpen(false)
                        }}
                      >
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {c.displayCode}
                        </span>
                        <span className="flex-1 truncate">{c.description}</span>
                        {c.isHazardous ? (
                          <Badge variant="destructive" className="shrink-0">
                            Haz
                          </Badge>
                        ) : null}
                        <CheckIcon
                          className={cn(
                            "ml-1 size-4",
                            value === c.code ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
