"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import { carbonYearOptions } from "@/lib/carbon-filters";
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

export function DashboardFilters({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentYear = params.get("year") ?? ALL;
  const currentSite = params.get("site") ?? ALL;
  const hasFilters = currentYear !== ALL || currentSite !== ALL;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Reporting year</Label>
        <div className="relative">
          <Select
            value={currentYear}
            onValueChange={(v) => setParam("year", String(v ?? ""))}
          >
            <SelectTrigger
              className={
                currentYear !== ALL ? "min-w-[140px] pr-14" : "min-w-[140px]"
              }
            >
              <PlaceholderValue allLabel="All years" resolve={(v) => v} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All years</SelectItem>
              {carbonYearOptions().map((y) => (
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
          <Label className="text-xs">Plant / Site</Label>
          <div className="relative">
            <Select
              value={currentSite}
              onValueChange={(v) => setParam("site", String(v ?? ""))}
            >
              <SelectTrigger
                className={
                  currentSite !== ALL ? "min-w-[180px] pr-14" : "min-w-[180px]"
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

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <XIcon className="size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
