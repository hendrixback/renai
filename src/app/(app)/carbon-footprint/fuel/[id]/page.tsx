import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, FlameIcon, PencilIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DocumentAttachments } from "@/components/documentation/document-attachments";
import { ActivityHistoryList } from "@/components/activity-history-list";

export const dynamic = "force-dynamic";

const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: "Diesel",
  petrol: "Petrol",
  natural_gas: "Natural gas",
  natural_gas_kwh: "Natural gas (kWh)",
  lpg: "LPG",
  heating_oil: "Heating oil",
  coal: "Coal",
  biodiesel: "Biodiesel",
  wood_pellets: "Wood pellets",
};

const EMISSION_SOURCE_TYPE_LABELS: Record<string, string> = {
  STATIONARY_COMBUSTION: "Stationary combustion",
  MOBILE_COMBUSTION: "Mobile combustion",
  COMPANY_VEHICLES: "Company vehicles",
  BOILERS: "Boilers",
  GENERATORS: "Generators",
  NATURAL_GAS_USE: "Natural gas use",
  DIESEL_USE: "Diesel use",
  LPG_USE: "LPG use",
  GASOLINE_USE: "Gasoline use",
  PROCESS_EMISSIONS: "Process emissions",
  FUGITIVE_EMISSIONS: "Fugitive emissions",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "outline",
  ARCHIVED: "secondary",
};

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 border-b border-border/50 py-3 last:border-0 md:grid-cols-[220px_1fr] md:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}

export default async function FuelEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/fuel");

  const { id } = await params;

  const entry = await prisma.fuelEntry.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      site: { select: { id: true, name: true } },
      emissionFactor: {
        select: {
          source: true,
          region: true,
          year: true,
          unit: true,
          kgCo2ePerUnit: true,
        },
      },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
    },
  });

  if (!entry) notFound();

  const fmtDate = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const kgCo2e = entry.kgCo2e ? Number(entry.kgCo2e) : null;
  const factorValue = entry.emissionFactor
    ? Number(entry.emissionFactor.kgCo2ePerUnit)
    : null;

  return (
    <>
      <PageHeader
        title={entry.title ?? `Scope 1 entry — ${FUEL_TYPE_LABELS[entry.fuelType] ?? entry.fuelType}`}
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          { label: "Scope 1 — Fuel", href: "/carbon-footprint/fuel" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/carbon-footprint/fuel" />}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              Back
            </Button>
            <Button
              size="sm"
              render={<Link href={`/carbon-footprint/fuel/${entry.id}/edit`} />}
            >
              <PencilIcon className="mr-1.5 size-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Summary banner */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <FlameIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Emissions</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {kgCo2e !== null
                    ? `${kgCo2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-muted-foreground text-xs">Quantity</p>
                <p className="font-mono text-sm tabular-nums">
                  {Number(entry.quantity).toLocaleString(undefined, {
                    maximumFractionDigits: 3,
                  })}{" "}
                  {entry.unit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Month</p>
                <p className="text-sm">
                  {entry.month.toLocaleString(undefined, {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[entry.recordStatus] ?? "default"}>
                {entry.recordStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Detail card */}
        <Card>
          <CardHeader>
            <CardTitle>Entry details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              <DetailRow label="Entry title">
                {entry.title ?? <Empty />}
              </DetailRow>
              <DetailRow label="Source reference">
                {entry.sourceReference ?? <Empty />}
              </DetailRow>
              <DetailRow label="Fuel type">
                {FUEL_TYPE_LABELS[entry.fuelType] ?? entry.fuelType}
              </DetailRow>
              <DetailRow label="Emission source type">
                {entry.emissionSourceType ? (
                  EMISSION_SOURCE_TYPE_LABELS[entry.emissionSourceType] ??
                  entry.emissionSourceType
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Quantity">
                {Number(entry.quantity).toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}{" "}
                {entry.unit}
              </DetailRow>
              <DetailRow label="Reporting period">
                {entry.reportingYear && entry.reportingMonth
                  ? `${entry.reportingYear}-${String(entry.reportingMonth).padStart(2, "0")}`
                  : entry.month.toISOString().slice(0, 7)}
              </DetailRow>
              <DetailRow label="Plant / Location">
                {entry.site?.name ?? entry.locationName ?? <Empty />}
              </DetailRow>
              <DetailRow label="Emission factor">
                {entry.emissionFactor ? (
                  <span>
                    {factorValue?.toFixed(4)} kgCO₂e/{entry.emissionFactor.unit}
                    {" — "}
                    <span className="text-muted-foreground">
                      {entry.emissionFactor.source} ({entry.emissionFactor.region ?? "GLOBAL"},{" "}
                      {entry.emissionFactor.year})
                    </span>
                  </span>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Calculated emissions">
                {kgCo2e !== null ? (
                  <span className="font-mono tabular-nums">
                    {kgCo2e.toLocaleString(undefined, {
                      maximumFractionDigits: 3,
                    })}{" "}
                    kgCO₂e
                  </span>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Notes">
                {entry.notes ? (
                  <p className="whitespace-pre-wrap">{entry.notes}</p>
                ) : (
                  <Empty />
                )}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentAttachments
          module="scope-1"
          recordId={entry.id}
          redirectTo={`/carbon-footprint/fuel/${entry.id}`}
        />

        {/* Activity history */}
        <ActivityHistoryList module="scope-1" recordId={entry.id} />

        {/* Metadata footer */}
        <div className="flex flex-wrap justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span>
            Created by{" "}
            <span className="text-foreground">
              {entry.createdBy?.name ?? entry.createdBy?.email ?? "Unknown"}
            </span>{" "}
            on {fmtDate(entry.createdAt)}
          </span>
          <span>
            Last updated{" "}
            {entry.updatedBy ? (
              <>
                by{" "}
                <span className="text-foreground">
                  {entry.updatedBy.name ?? entry.updatedBy.email}
                </span>{" "}
              </>
            ) : null}
            on {fmtDate(entry.updatedAt)}
          </span>
        </div>
      </div>
    </>
  );
}
