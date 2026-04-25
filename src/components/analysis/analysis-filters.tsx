"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import {
  ANALYSIS_SCOPE_OPTIONS,
  analysisYearOptions,
  type AnalysisScope,
} from "@/lib/analysis-filters";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectClearButton } from "@/components/ui/select-clear";
import { cn } from "@/lib/utils";

type SiteOption = { id: string; name: string };

function PlaceholderValue({
  fallback,
  resolve,
}: {
  fallback: string;
  resolve: (value: string) => string | undefined;
}) {
  return (
    <SelectValue>
      {(raw) => {
        const v = typeof raw === "string" ? raw : "";
        if (!v) return <span className="text-muted-foreground">{fallback}</span>;
        return resolve(v) ?? v;
      }}
    </SelectValue>
  );
}

const ALL_SCOPES = ANALYSIS_SCOPE_OPTIONS.map((o) => o.value).join(",");

export function AnalysisFilters({
  sites,
  defaultYear,
}: {
  sites: SiteOption[];
  defaultYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const yearParam = params.get("year") ?? String(defaultYear);
  const siteParam = params.get("site") ?? "";
  const scopeParam = params.get("scopes") ?? ALL_SCOPES;
  const yoy = params.get("yoy") === "1";

  const selectedScopes = React.useMemo(() => {
    return new Set(
      scopeParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is AnalysisScope =>
          ANALYSIS_SCOPE_OPTIONS.some((o) => o.value === s),
        ),
    );
  }, [scopeParam]);

  const update = (next: URLSearchParams) => {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    update(next);
  };

  const toggleScope = (scope: AnalysisScope) => {
    const next = new URLSearchParams(params.toString());
    const current = new Set(selectedScopes);
    if (current.has(scope)) current.delete(scope);
    else current.add(scope);
    if (current.size === 0) {
      // Re-select the toggled one to avoid an empty selection rendering nothing.
      current.add(scope);
    }
    if (current.size === ANALYSIS_SCOPE_OPTIONS.length) next.delete("scopes");
    else next.set("scopes", Array.from(current).join(","));
    update(next);
  };

  const yearOptions = analysisYearOptions();
  const hasNonDefault =
    yearParam !== String(defaultYear) ||
    siteParam !== "" ||
    selectedScopes.size !== ANALYSIS_SCOPE_OPTIONS.length ||
    yoy;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Reporting year</Label>
        <Select
          value={yearParam}
          onValueChange={(v) => setParam("year", v ? String(v) : null)}
        >
          <SelectTrigger className="min-w-[140px]">
            <PlaceholderValue
              fallback={String(defaultYear)}
              resolve={(v) => v}
            />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sites.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Plant / Site</Label>
          <div className="relative">
            <Select
              value={siteParam}
              onValueChange={(v) => setParam("site", v ? String(v) : null)}
            >
              <SelectTrigger
                className={cn(
                  siteParam ? "min-w-[180px] pr-14" : "min-w-[180px]",
                )}
              >
                <PlaceholderValue
                  fallback="All sites"
                  resolve={(v) => sites.find((s) => s.id === v)?.name}
                />
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
              visible={siteParam !== ""}
              onClear={() => setParam("site", null)}
              label="Clear site filter"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Scopes</Label>
        <div className="flex h-9 flex-wrap items-center gap-1">
          {ANALYSIS_SCOPE_OPTIONS.map((opt) => {
            const on = selectedScopes.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleScope(opt.value)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Compare prior year</Label>
        <div className="flex h-9 items-center gap-2">
          <Switch
            checked={yoy}
            onCheckedChange={(v) => setParam("yoy", v ? "1" : null)}
            aria-label="Toggle year-over-year comparison"
          />
          <span className="text-sm text-muted-foreground">
            {yoy ? "On" : "Off"}
          </span>
        </div>
      </div>

      {hasNonDefault ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <XIcon className="size-4" />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
