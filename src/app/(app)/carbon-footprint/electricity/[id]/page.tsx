import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, PencilIcon, ZapIcon } from "lucide-react";

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

export const dynamic = "force-dynamic";

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

export default async function ElectricityEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/electricity");

  const { id } = await params;

  const entry = await prisma.electricityEntry.findFirst({
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

  // Prefer the dual-calc columns; fall back to the legacy kgCo2e for rows
  // written before migration 0004.
  const locationBased = entry.locationBasedKgCo2e
    ? Number(entry.locationBasedKgCo2e)
    : null;
  const marketBased = entry.marketBasedKgCo2e
    ? Number(entry.marketBasedKgCo2e)
    : entry.kgCo2e
      ? Number(entry.kgCo2e)
      : null;
  const factorValue = entry.emissionFactor
    ? Number(entry.emissionFactor.kgCo2ePerUnit)
    : null;
  const renewablePct = entry.renewablePercent
    ? Number(entry.renewablePercent)
    : null;

  return (
    <>
      <PageHeader
        title={`Scope 2 entry — ${entry.month.toLocaleString(undefined, { year: "numeric", month: "long" })}`}
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          {
            label: "Scope 2 — Electricity",
            href: "/carbon-footprint/electricity",
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/carbon-footprint/electricity" />}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              Back
            </Button>
            <Button
              size="sm"
              render={
                <Link
                  href={`/carbon-footprint/electricity/${entry.id}/edit`}
                />
              }
            >
              <PencilIcon className="mr-1.5 size-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Summary banner — dual-calc per Spec §11.4 */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <ZapIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Consumption</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {Number(entry.kwh).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  kWh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div title="Pure grid factor × kWh — renewable % ignored.">
                <p className="text-muted-foreground text-xs">Location-based</p>
                <p className="font-mono text-sm tabular-nums">
                  {locationBased !== null
                    ? `${locationBased.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e`
                    : "—"}
                </p>
              </div>
              <div title="Contract-adjusted (RECs/GoOs via renewable %).">
                <p className="text-muted-foreground text-xs">Market-based</p>
                <p className="font-mono text-sm tabular-nums">
                  {marketBased !== null
                    ? `${marketBased.toLocaleString(undefined, { maximumFractionDigits: 1 })} kgCO₂e`
                    : "—"}
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
              <DetailRow label="kWh">
                {Number(entry.kwh).toLocaleString(undefined, {
                  maximumFractionDigits: 3,
                })}
              </DetailRow>
              <DetailRow label="Reporting period">
                {entry.reportingYear && entry.reportingMonth
                  ? `${entry.reportingYear}-${String(entry.reportingMonth).padStart(2, "0")}`
                  : entry.month.toISOString().slice(0, 7)}
              </DetailRow>
              <DetailRow label="Renewable %">
                {renewablePct !== null ? (
                  `${renewablePct.toFixed(1)}%`
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Energy provider">
                {entry.energyProvider ?? <Empty />}
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
              <DetailRow label="Location-based emissions">
                {locationBased !== null ? (
                  <span className="font-mono tabular-nums">
                    {locationBased.toLocaleString(undefined, {
                      maximumFractionDigits: 3,
                    })}{" "}
                    kgCO₂e
                  </span>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Market-based emissions">
                {marketBased !== null ? (
                  <span className="font-mono tabular-nums">
                    {marketBased.toLocaleString(undefined, {
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
          module="scope-2"
          recordId={entry.id}
          redirectTo={`/carbon-footprint/electricity/${entry.id}`}
        />

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
