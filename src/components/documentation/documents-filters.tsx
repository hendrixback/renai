"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { XIcon } from "lucide-react";

import {
  DOCUMENT_TYPES,
  type DocumentTypeValue,
} from "@/lib/schemas/document.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

const DOCUMENT_TYPE_LABELS: Record<DocumentTypeValue, string> = {
  INVOICE: "Invoice",
  WASTE_CERTIFICATE: "Waste certificate",
  COLLECTION_RECEIPT: "Collection receipt",
  FUEL_BILL: "Fuel bill",
  ELECTRICITY_BILL: "Electricity bill",
  SUPPLIER_DOCUMENT: "Supplier document",
  INTERNAL_REPORT: "Internal report",
  AUDIT_EVIDENCE: "Audit evidence",
  ENVIRONMENTAL_LICENSE: "Environmental license",
  CONTRACT: "Contract",
  EMISSIONS_EVIDENCE: "Emissions evidence",
  PRODUCTION_REPORT: "Production report",
  REGULATORY_FILE: "Regulatory file",
  OTHER: "Other",
};

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

export function DocumentsFilters({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [year, setYear] = React.useState(params.get("year") ?? "");

  const currentType = params.get("type") ?? ALL;
  const currentPlant = params.get("plant") ?? ALL;

  const hasFilters =
    q.length > 0 ||
    year.length > 0 ||
    currentType !== ALL ||
    currentPlant !== ALL;

  const push = React.useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const setParam = (key: string, value: string | null) => {
    push((next) => {
      if (value === null || value === "" || value === ALL) next.delete(key);
      else next.set(key, value);
    });
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setParam("q", q.trim());
  };

  const submitYear = (event: React.FormEvent) => {
    event.preventDefault();
    setParam("year", year.trim());
  };

  const reset = () => {
    setQ("");
    setYear("");
    router.push(pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={submitSearch} className="flex-1 min-w-[220px]">
        <Input
          type="search"
          placeholder="Search by name, description, tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search documents"
        />
      </form>

      <Select
        value={currentType}
        onValueChange={(v) => setParam("type", v === ALL ? null : v)}
      >
        <SelectTrigger className="min-w-[180px]">
          <PlaceholderValue
            allLabel="All types"
            resolve={(v) => DOCUMENT_TYPE_LABELS[v as DocumentTypeValue]}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {DOCUMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentPlant}
        onValueChange={(v) => setParam("plant", v === ALL ? null : v)}
      >
        <SelectTrigger className="min-w-[160px]">
          <PlaceholderValue
            allLabel="All plants"
            resolve={(v) => sites.find((s) => s.id === v)?.name}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All plants</SelectItem>
          {sites.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <form onSubmit={submitYear}>
        <Input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min={2000}
          max={2100}
          aria-label="Reporting year"
          className="w-[100px]"
        />
      </form>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={reset} type="button">
          <XIcon className="mr-1 size-4" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
