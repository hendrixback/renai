import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  PencilIcon,
} from "lucide-react";

import { ActivityHistoryList } from "@/components/activity-history-list";
import { DocumentAttachments } from "@/components/documentation/document-attachments";
import { PageHeader } from "@/components/page-header";
import {
  REGULATION_PRIORITY_LABELS,
  REGULATION_STATUS_LABELS,
  REGULATION_TOPIC_LABELS,
  REGULATION_TYPE_LABELS,
  priorityVariant,
  statusVariant,
} from "@/components/regulations/labels";
import { DeleteRegulationButton } from "@/components/regulations/delete-regulation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { RegulationsService } from "@/lib/services/regulations";

export const dynamic = "force-dynamic";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/50 grid gap-0.5 border-b py-3 last:border-0 md:grid-cols-[200px_1fr] md:gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground">—</span>;
}

export default async function RegulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/regulations");

  const { id } = await params;
  const reg = await RegulationsService.getById(ctx, id);
  if (!reg) notFound();

  const canManage = hasRole(ctx, "ADMIN");
  const fmtDate = (d: Date) =>
    d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader
        title={reg.title}
        breadcrumbs={[{ label: "Regulations", href: "/regulations" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/regulations" />}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              Back
            </Button>
            {canManage ? (
              <>
                <Button
                  size="sm"
                  render={<Link href={`/regulations/${reg.id}/edit`} />}
                >
                  <PencilIcon className="mr-1.5 size-4" />
                  Edit
                </Button>
                <DeleteRegulationButton
                  id={reg.id}
                  redirectTo="/regulations"
                />
              </>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Banner */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 flex size-10 items-center justify-center rounded-full">
                <BookOpenIcon className="size-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {REGULATION_TYPE_LABELS[reg.type]} ·{" "}
                  {REGULATION_TOPIC_LABELS[reg.topic]}
                </p>
                <p className="font-mono text-sm">{reg.geography}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(reg.regulatoryStatus)}>
                {REGULATION_STATUS_LABELS[reg.regulatoryStatus]}
              </Badge>
              <Badge variant={priorityVariant(reg.priorityLevel)}>
                {REGULATION_PRIORITY_LABELS[reg.priorityLevel]} priority
              </Badge>
              {reg.appliesToUs ? (
                <Badge variant="default">Applies to us</Badge>
              ) : (
                <Badge variant="outline">Does not apply</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reg.summary}</p>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col">
              <DetailRow label="Source reference">
                {reg.sourceReference ? (
                  /^https?:\/\//.test(reg.sourceReference) ? (
                    <a
                      href={reg.sourceReference}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      {reg.sourceReference}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : (
                    reg.sourceReference
                  )
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Effective date">
                {reg.effectiveDate
                  ? reg.effectiveDate.toISOString().slice(0, 10)
                  : <Empty />}
              </DetailRow>
              <DetailRow label="Reviewed by">
                {reg.reviewedBy ? (
                  <>
                    {reg.reviewedBy.name ?? reg.reviewedBy.email}
                    {reg.reviewDate
                      ? ` on ${reg.reviewDate.toISOString().slice(0, 10)}`
                      : null}
                  </>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Internal notes">
                {reg.internalNotes ? (
                  <p className="whitespace-pre-wrap">{reg.internalNotes}</p>
                ) : (
                  <Empty />
                )}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentAttachments
          module="regulation"
          recordId={reg.id}
          redirectTo={`/regulations/${reg.id}`}
        />

        {/* Activity */}
        <ActivityHistoryList module="regulations" recordId={reg.id} />

        {/* Footer */}
        <div className="text-muted-foreground flex flex-wrap justify-between gap-3 pt-2 text-xs">
          <span>
            Created by{" "}
            <span className="text-foreground">
              {reg.createdBy?.name ?? reg.createdBy?.email ?? "Unknown"}
            </span>{" "}
            on {fmtDate(reg.createdAt)}
          </span>
          <span>
            Last updated{" "}
            {reg.updatedBy ? (
              <>
                by{" "}
                <span className="text-foreground">
                  {reg.updatedBy.name ?? reg.updatedBy.email}
                </span>{" "}
              </>
            ) : null}
            on {fmtDate(reg.updatedAt)}
          </span>
        </div>
      </div>
    </>
  );
}
