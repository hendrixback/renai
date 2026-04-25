import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  NetworkIcon,
  PencilIcon,
} from "lucide-react";

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
import { DeleteScope3EntryButton } from "@/components/carbon/delete-scope3-entry-button";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  PURCHASED_GOODS_SERVICES: "Purchased goods & services",
  FUEL_ENERGY_RELATED: "Fuel & energy-related (upstream)",
  UPSTREAM_TRANSPORT: "Upstream transport & distribution",
  WASTE_GENERATED: "Waste generated in operations",
  BUSINESS_TRAVEL: "Business travel",
  EMPLOYEE_COMMUTING: "Employee commuting",
  DOWNSTREAM_TRANSPORT: "Downstream transport & distribution",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  DRAFT: "outline",
  ARCHIVED: "secondary",
};

const TRAVEL_MODE_LABELS: Record<string, string> = {
  air_short_haul: "Flight (short-haul)",
  air_long_haul: "Flight (long-haul)",
  air_domestic: "Flight (domestic)",
  rail_national: "Rail (national)",
  rail_international: "Rail (international)",
  taxi_regular: "Taxi",
  bus_coach: "Bus / coach",
  car_petrol_avg: "Car — petrol",
  car_diesel_avg: "Car — diesel",
  hotel_night: "Hotel",
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

function getProp(data: unknown, key: string): unknown {
  if (data && typeof data === "object" && key in data) {
    return (data as Record<string, unknown>)[key];
  }
  return undefined;
}

export default async function Scope3DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/carbon-footprint/value-chain");

  const { id } = await params;

  const entry = await prisma.scope3Entry.findFirst({
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
  const data = entry.categoryData;

  // Per-category formatted activity row.
  const isTravel = entry.category === "BUSINESS_TRAVEL";
  const travelMode =
    isTravel && typeof getProp(data, "mode") === "string"
      ? (getProp(data, "mode") as string)
      : null;
  const travelDistance =
    isTravel && typeof getProp(data, "distanceKm") === "number"
      ? (getProp(data, "distanceKm") as number)
      : null;
  const travelPassengers =
    isTravel && typeof getProp(data, "passengers") === "number"
      ? (getProp(data, "passengers") as number)
      : null;
  const travelNights =
    isTravel && typeof getProp(data, "nights") === "number"
      ? (getProp(data, "nights") as number)
      : null;
  const travelOrigin =
    isTravel && typeof getProp(data, "origin") === "string"
      ? (getProp(data, "origin") as string)
      : null;
  const travelDestination =
    isTravel && typeof getProp(data, "destination") === "string"
      ? (getProp(data, "destination") as string)
      : null;

  const genericAmount =
    !isTravel && typeof getProp(data, "amount") === "number"
      ? (getProp(data, "amount") as number)
      : null;
  const genericUnit =
    !isTravel && typeof getProp(data, "unit") === "string"
      ? (getProp(data, "unit") as string)
      : null;

  // WASTE_GENERATED → linked WasteFlow lookup so the detail page can
  // hyperlink back to the source record.
  const linkedWasteFlowId =
    entry.category === "WASTE_GENERATED" &&
    typeof getProp(data, "wasteFlowId") === "string"
      ? (getProp(data, "wasteFlowId") as string)
      : null;
  const linkedWasteFlow = linkedWasteFlowId
    ? await prisma.wasteFlow.findFirst({
        where: { id: linkedWasteFlowId, companyId: ctx.company.id },
        select: { id: true, name: true, deletedAt: true },
      })
    : null;

  return (
    <>
      <PageHeader
        title={`Scope 3 — ${CATEGORY_LABEL[entry.category] ?? entry.category}`}
        breadcrumbs={[
          { label: "Carbon Footprint", href: "/carbon-footprint" },
          {
            label: "Scope 3 — Value chain",
            href: "/carbon-footprint/value-chain",
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/carbon-footprint/value-chain" />}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              Back
            </Button>
            <Button
              size="sm"
              render={<Link href={`/carbon-footprint/value-chain/${entry.id}/edit`} />}
            >
              <PencilIcon className="mr-1.5 size-4" />
              Edit
            </Button>
            <DeleteScope3EntryButton id={entry.id} description={entry.description} />
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Summary banner */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <NetworkIcon className="size-5" />
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
                <p className="text-muted-foreground text-xs">Description</p>
                <p className="font-medium">{entry.description}</p>
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
              <DetailRow label="Category">
                <Badge variant="outline">
                  {CATEGORY_LABEL[entry.category] ?? entry.category}
                </Badge>
              </DetailRow>
              <DetailRow label="Description">{entry.description}</DetailRow>
              <DetailRow label="Reporting period">
                {`${entry.reportingYear}-${String(entry.reportingMonth).padStart(2, "0")}`}
              </DetailRow>
              <DetailRow label="Plant / Site">
                {entry.site?.name ?? <Empty />}
              </DetailRow>
              {isTravel ? (
                <>
                  <DetailRow label="Travel mode">
                    {travelMode
                      ? TRAVEL_MODE_LABELS[travelMode] ?? travelMode
                      : <Empty />}
                  </DetailRow>
                  {travelMode === "hotel_night" ? (
                    <DetailRow label="Nights">
                      {travelNights ?? <Empty />}
                    </DetailRow>
                  ) : (
                    <>
                      <DetailRow label="Distance">
                        {travelDistance !== null ? (
                          <span className="font-mono tabular-nums">
                            {travelDistance.toLocaleString()} km
                          </span>
                        ) : (
                          <Empty />
                        )}
                      </DetailRow>
                      <DetailRow label="Passengers">
                        {travelPassengers ?? 1}
                      </DetailRow>
                      {travelOrigin || travelDestination ? (
                        <DetailRow label="Route">
                          {travelOrigin ?? "—"} → {travelDestination ?? "—"}
                        </DetailRow>
                      ) : null}
                    </>
                  )}
                </>
              ) : entry.category === "WASTE_GENERATED" ? (
                <DetailRow label="Linked waste flow">
                  {linkedWasteFlow ? (
                    <Link
                      href={`/waste-flows/${linkedWasteFlow.id}`}
                      className="hover:underline"
                    >
                      {linkedWasteFlow.name}
                      {linkedWasteFlow.deletedAt ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (deleted)
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <Empty />
                  )}
                </DetailRow>
              ) : (
                <>
                  {genericAmount !== null ? (
                    <DetailRow label="Activity amount">
                      <span className="font-mono tabular-nums">
                        {genericAmount.toLocaleString()} {genericUnit ?? ""}
                      </span>
                    </DetailRow>
                  ) : null}
                </>
              )}
              <DetailRow label="Emission factor">
                {entry.emissionFactor ? (
                  <span>
                    {factorValue?.toFixed(4)} kgCO₂e/{entry.emissionFactor.unit}
                    {" — "}
                    <span className="text-muted-foreground">
                      {entry.emissionFactor.source} (
                      {entry.emissionFactor.region ?? "GLOBAL"},{" "}
                      {entry.emissionFactor.year})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    No factor matched — kgCO₂e {kgCo2e !== null ? "from manual override" : "blank"}.
                  </span>
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
          module="scope-3"
          recordId={entry.id}
          redirectTo={`/carbon-footprint/value-chain/${entry.id}`}
        />

        {/* Activity history */}
        <ActivityHistoryList module="scope-3" recordId={entry.id} />

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
