import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MapPinIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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

function formatAddress(site: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
}): string {
  const parts = [
    [site.addressLine1, site.addressLine2].filter(Boolean).join(", "),
    [site.postalCode, site.city].filter(Boolean).join(" "),
    [site.region, site.country].filter(Boolean).join(", "),
  ].filter((p) => p.length > 0);
  return parts.join(" · ") || "—";
}

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

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/settings/sites");

  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
    },
  });
  if (!site) notFound();

  // Aggregate counts for the "linked records" strip. Each query is cheap
  // (indexed on companyId+siteId) and runs in parallel.
  const [wasteFlowCount, fuelCount, electricityCount, documentCount] =
    await Promise.all([
      prisma.wasteFlow.count({ where: { companyId: ctx.company.id, siteId: site.id, deletedAt: null } }),
      prisma.fuelEntry.count({ where: { companyId: ctx.company.id, siteId: site.id, deletedAt: null } }),
      prisma.electricityEntry.count({ where: { companyId: ctx.company.id, siteId: site.id, deletedAt: null } }),
      prisma.document.count({ where: { companyId: ctx.company.id, plantId: site.id, deletedAt: null } }),
    ]);

  const fmtDate = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader
        title={site.name}
        breadcrumbs={[
          { label: "Settings", href: "/settings/sites" },
          { label: "Sites", href: "/settings/sites" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <MapPinIcon className="size-3" />
            {site.country ?? "—"}
          </Badge>
          {wasteFlowCount > 0 ? (
            <Link href={`/waste-flows?site=${site.id}`}>
              <Badge variant="secondary">
                {wasteFlowCount} waste flow{wasteFlowCount === 1 ? "" : "s"}
              </Badge>
            </Link>
          ) : null}
          {fuelCount > 0 ? (
            <Badge variant="secondary">
              {fuelCount} Scope 1 entr{fuelCount === 1 ? "y" : "ies"}
            </Badge>
          ) : null}
          {electricityCount > 0 ? (
            <Badge variant="secondary">
              {electricityCount} Scope 2 entr{electricityCount === 1 ? "y" : "ies"}
            </Badge>
          ) : null}
          {documentCount > 0 ? (
            <Badge variant="secondary">
              {documentCount} document{documentCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50">
              <DetailRow label="Name">{site.name}</DetailRow>
              <DetailRow label="Address">
                {formatAddress(site) === "—" ? <Empty /> : formatAddress(site)}
              </DetailRow>
              <DetailRow label="Address line 1">
                {site.addressLine1 ?? <Empty />}
              </DetailRow>
              <DetailRow label="Address line 2">
                {site.addressLine2 ?? <Empty />}
              </DetailRow>
              <DetailRow label="Postal code">
                {site.postalCode ?? <Empty />}
              </DetailRow>
              <DetailRow label="City">{site.city ?? <Empty />}</DetailRow>
              <DetailRow label="Region / state">
                {site.region ?? <Empty />}
              </DetailRow>
              <DetailRow label="Country">{site.country ?? <Empty />}</DetailRow>
            </dl>
          </CardContent>
        </Card>

        <DocumentAttachments
          module="sites"
          recordId={site.id}
          redirectTo={`/settings/sites/${site.id}`}
        />

        <ActivityHistoryList module="sites" recordId={site.id} />

        <div className="flex flex-wrap justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span>
            Created by{" "}
            <span className="text-foreground">
              {site.createdBy?.name ?? site.createdBy?.email ?? "Unknown"}
            </span>{" "}
            on {fmtDate(site.createdAt)}
          </span>
          <span>
            Last updated{" "}
            {site.updatedBy ? (
              <>
                by{" "}
                <span className="text-foreground">
                  {site.updatedBy.name ?? site.updatedBy.email}
                </span>{" "}
              </>
            ) : null}
            on {fmtDate(site.updatedAt)}
          </span>
        </div>
      </div>
    </>
  );
}
