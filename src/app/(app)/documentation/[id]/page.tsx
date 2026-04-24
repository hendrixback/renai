import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DownloadIcon, TrashIcon } from "lucide-react";

import { deleteDocument } from "@/app/(app)/documentation/actions";
import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { formatBytes } from "@/lib/format/bytes";
import { prisma } from "@/lib/prisma";
import { DocumentService } from "@/lib/services/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DocumentPreview } from "@/components/documentation/document-preview";

export const dynamic = "force-dynamic";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
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

const MODULE_LABELS: Record<string, string> = {
  "waste-flows": "Waste flow",
  "scope-1": "Scope 1 entry",
  "scope-2": "Scope 2 entry",
  "scope-3": "Scope 3 entry",
  production: "Production intensity",
  regulation: "Regulation",
  account: "Account",
  team: "Team",
};

const MODULE_HREFS: Record<string, (recordId: string) => string> = {
  "waste-flows": (id) => `/waste-flows/${id}`,
  "scope-1": () => "/carbon-footprint/fuel",
  "scope-2": () => "/carbon-footprint/electricity",
  "scope-3": () => "/carbon-footprint/value-chain",
  production: () => "/carbon-footprint/production",
  regulation: (id) => `/regulations/${id}`,
  account: () => "/settings/account",
  team: () => "/team-overview",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/documentation");

  const { id } = await params;
  const doc = await DocumentService.findByIdForTenant(ctx, id);
  if (!doc) notFound();

  const [links, uploadedBy, plant] = await Promise.all([
    DocumentService.listLinksForDocument(ctx, doc.id),
    doc.uploadedById
      ? prisma.user.findUnique({
          where: { id: doc.uploadedById },
          select: { name: true, email: true },
        })
      : Promise.resolve(null),
    doc.plantId
      ? prisma.site.findUnique({
          where: { id: doc.plantId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const title = doc.title ?? doc.originalFilename;
  const canDelete = hasRole(ctx, "ADMIN");
  const fmtDate = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: "Documentation", href: "/documentation" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/documentation/${doc.id}/download`} />}
            >
              <DownloadIcon className="mr-1.5 size-4" />
              Download
            </Button>
            {canDelete ? (
              <form
                action={async () => {
                  "use server";
                  await deleteDocument(doc.id);
                  redirect("/documentation");
                }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  type="submit"
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="mr-1.5 size-4" />
                  Delete
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Preview */}
          <div>
            <DocumentPreview
              documentId={doc.id}
              filename={doc.originalFilename}
              mimeType={doc.mimeType}
            />
          </div>

          {/* Metadata sidebar */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <MetaRow label="Type">
                  <Badge variant="secondary">
                    {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </Badge>
                </MetaRow>
                <MetaRow label="Filename">
                  <span className="break-all font-mono text-xs">
                    {doc.originalFilename}
                  </span>
                </MetaRow>
                <MetaRow label="Size">{formatBytes(doc.size)}</MetaRow>
                <MetaRow label="MIME">
                  <span className="font-mono text-xs">{doc.mimeType}</span>
                </MetaRow>
                <MetaRow label="Reporting period">
                  {formatPeriod(doc.reportingYear, doc.reportingMonth)}
                </MetaRow>
                <MetaRow label="Plant">
                  {plant?.name ?? <Empty />}
                </MetaRow>
                <MetaRow label="Department">
                  {doc.department ?? <Empty />}
                </MetaRow>
                <MetaRow label="Tags">
                  {doc.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Empty />
                  )}
                </MetaRow>
                <MetaRow label="Uploaded by">
                  {uploadedBy?.name ?? uploadedBy?.email ?? <Empty />}
                </MetaRow>
                <MetaRow label="Uploaded">{fmtDate(doc.createdAt)}</MetaRow>
                {doc.updatedAt.getTime() !== doc.createdAt.getTime() ? (
                  <MetaRow label="Last updated">
                    {fmtDate(doc.updatedAt)}
                  </MetaRow>
                ) : null}
              </CardContent>
            </Card>

            {doc.description ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">
                    {doc.description}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attached to</CardTitle>
              </CardHeader>
              <CardContent>
                {links.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Not attached to any records yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {links.map((link) => {
                      const label =
                        MODULE_LABELS[link.module] ?? link.module;
                      const href = MODULE_HREFS[link.module]?.(link.recordId);
                      return (
                        <li key={link.id}>
                          {href ? (
                            <Link
                              href={href}
                              className="text-sm hover:underline"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className="text-sm">{label}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}

function formatPeriod(
  year: number | null,
  month: number | null,
): React.ReactNode {
  if (!year) return <Empty />;
  if (!month) return String(year);
  const m = String(month).padStart(2, "0");
  return `${year}-${m}`;
}
