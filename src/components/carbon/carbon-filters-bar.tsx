"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import {
  CARBON_STATUS_OPTIONS,
  EMISSION_SOURCE_TYPE_OPTIONS,
  carbonYearOptions,
} from "@/lib/carbon-filters";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectClearButton } from "@/components/ui/select-clear";

const ALL = "all";

type SiteOption = { id: string; name: string };

function PlaceholderValue({
  allLabel,
  resolve,
}: {
  allLabel: string;
  resolve: (value: string) => string | undefined;
}) {
  return (
    <SelectValue>
      {(raw) => {
        const v = typeof raw === "string" ? raw : "";
        if (!v || v === ALL) {
          return <span className="text-muted-foreground">{allLabel}</span>;
        }
        return resolve(v) ?? v;
      }}
    </SelectValue>
  );
}

export function CarbonFiltersBar({
  sites,
  showSourceType = false,
}: {
  sites: SiteOption[];
  /** Scope 1 only — Scope 2 doesn't have an emission source type today. */
  showSourceType?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentYear = params.get("year") ?? ALL;
  const currentSite = params.get("site") ?? ALL;
  const currentSourceType = params.get("sourceType") ?? ALL;
  const currentStatus = params.get("status") ?? ALL;

  const hasFilters =
    currentYear !== ALL ||
    currentSite !== ALL ||
    currentSourceType !== ALL ||
    currentStatus !== ALL;

  const push = React.useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const setParam = (key: string, value: string) =>
    push((next) => {
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
    });

  const reset = () => {
    router.replace(pathname, { scroll: false });
  };

  const yearOptions = carbonYearOptions();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Year</Label>
        <div className="relative">
          <Select
            value={currentYear}
            onValueChange={(v) => setParam("year", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentYear !== ALL ? "min-w-[120px] pr-14" : "min-w-[120px]"
              }
            >
              <PlaceholderValue allLabel="All years" resolve={(v) => v} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All years</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SelectClearButton
            visible={currentYear !== ALL}
            onClear={() => setParam("year", "")}
            label="Clear year filter"
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
                  currentSite !== ALL ? "min-w-[170px] pr-14" : "min-w-[170px]"
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

      {showSourceType ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Source type</Label>
          <div className="relative">
            <Select
              value={currentSourceType}
              onValueChange={(v) => setParam("sourceType", String(v ?? ""))}
            >
              <SelectTrigger
                className={
                  currentSourceType !== ALL
                    ? "min-w-[200px] pr-14"
                    : "min-w-[200px]"
                }
              >
                <PlaceholderValue
                  allLabel="All sources"
                  resolve={(v) =>
                    EMISSION_SOURCE_TYPE_OPTIONS.find((o) => o.value === v)
                      ?.label
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sources</SelectItem>
                {EMISSION_SOURCE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SelectClearButton
              visible={currentSourceType !== ALL}
              onClear={() => setParam("sourceType", "")}
              label="Clear source-type filter"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Status</Label>
        <div className="relative">
          <Select
            value={currentStatus}
            onValueChange={(v) => setParam("status", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentStatus !== ALL ? "min-w-[140px] pr-14" : "min-w-[140px]"
              }
            >
              <PlaceholderValue
                allLabel="All statuses"
                resolve={(v) =>
                  CARBON_STATUS_OPTIONS.find((o) => o.value === v)?.label
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CARBON_STATUS_OPTIONS.map((o) => (
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

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={reset}>
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
