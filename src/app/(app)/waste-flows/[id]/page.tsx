import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlameIcon, PencilIcon, StarIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FREQUENCY_OPTIONS,
  STATUS_OPTIONS,
  TREATMENT_OPTIONS,
  UNIT_OPTIONS,
} from "@/lib/waste-flows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { WasteFlowDeleteButton } from "@/components/waste-flow-delete-button";
import { DocumentAttachments } from "@/components/documentation/document-attachments";
import { ActivityHistoryList } from "@/components/activity-history-list";

export const dynamic = "force-dynamic";

function label<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
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

export default async function WasteFlowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/waste-flows");

  const { id } = await params;

  const flow = await prisma.wasteFlow.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      category: true,
      wasteCode: true,
      site: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!flow) notFound();

  const fmtDate = (d: Date) =>
    d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <>
      <PageHeader
        title={flow.name}
        breadcrumbs={[{ label: "Waste Flows", href: "/waste-flows" }]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/waste-flows/${flow.id}/edit`}>
                  <PencilIcon className="size-4" />
                  Edit
                </Link>
              }
            />
            <WasteFlowDeleteButton id={flow.id} name={flow.name} />
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Top-line badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              flow.status === "ACTIVE"
                ? "default"
                : flow.status === "INACTIVE"
                  ? "secondary"
                  : "outline"
            }
          >
            {label(STATUS_OPTIONS, flow.status)}
          </Badge>
          {flow.isHazardous ? (
            <Badge variant="destructive" className="gap-1">
              <FlameIcon className="size-3" />
              Hazardous
            </Badge>
          ) : null}
          {flow.isPriority ? (
            <Badge
              variant="secondary"
              className="gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400"
            >
              <StarIcon className="size-3 fill-current" />
              Priority
            </Badge>
          ) : null}
          {flow.wasteCode ? (
            <Badge variant="outline" className="gap-1.5 font-mono text-xs">
              {flow.wasteCode.displayCode}
              <span className="font-sans font-normal text-muted-foreground">
                {flow.wasteCode.description}
              </span>
            </Badge>
          ) : null}
        </div>

        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50">
              <DetailRow label="Name">{flow.name}</DetailRow>
              <DetailRow label="Category">
                {flow.category?.name ?? <Empty />}
              </DetailRow>
              <DetailRow label="LoW / EWC Code">
                {flow.wasteCode ? (
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums">
                      {flow.wasteCode.displayCode}
                    </span>
                    <span>{flow.wasteCode.description}</span>
                    {flow.wasteCode.isHazardous ? (
                      <Badge variant="destructive">Hazardous</Badge>
                    ) : null}
                  </span>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Description">
                {flow.description ? (
                  <p className="whitespace-pre-wrap">{flow.description}</p>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Material Composition">
                {flow.materialComposition ?? <Empty />}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Quantities */}
        <Card>
          <CardHeader>
            <CardTitle>Quantities & Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50">
              <DetailRow label="Estimated Quantity">
                {flow.estimatedQuantity ? (
                  <span className="font-mono tabular-nums">
                    {flow.estimatedQuantity.toString()}
                    <span className="ml-1 text-muted-foreground">
                      {label(UNIT_OPTIONS, flow.quantityUnit)}
                    </span>
                  </span>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Frequency">
                {label(FREQUENCY_OPTIONS, flow.frequency)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50">
              <DetailRow label="Current Storage Method">
                {flow.storageMethod ?? <Empty />}
              </DetailRow>
              <DetailRow label="Current Destination">
                {flow.currentDestination ?? <Empty />}
              </DetailRow>
              <DetailRow label="Current Operator">
                {flow.currentOperator ?? <Empty />}
              </DetailRow>
              <DetailRow label="Site / Location">
                {flow.site?.name ?? flow.locationName ?? <Empty />}
              </DetailRow>
              <DetailRow label="Internal Code">
                {flow.internalCode ?? <Empty />}
              </DetailRow>
              <DetailRow label="Treatment Type">
                {flow.treatmentCode ? (
                  label(TREATMENT_OPTIONS, flow.treatmentCode)
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Treatment Notes">
                {flow.treatmentNotes ?? <Empty />}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Additional */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/50">
              <DetailRow label="Recovery Potential Notes">
                {flow.recoveryNotes ? (
                  <p className="whitespace-pre-wrap">{flow.recoveryNotes}</p>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Notes">
                {flow.notes ? (
                  <p className="whitespace-pre-wrap">{flow.notes}</p>
                ) : (
                  <Empty />
                )}
              </DetailRow>
              <DetailRow label="Hazardous">
                {flow.isHazardous ? "Yes" : "No"}
              </DetailRow>
              <DetailRow label="Priority">
                {flow.isPriority ? "Yes" : "No"}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Documents */}
        <DocumentAttachments
          module="waste-flows"
          recordId={flow.id}
          redirectTo={`/waste-flows/${flow.id}`}
        />

        {/* Activity history */}
        <ActivityHistoryList module="waste-flows" recordId={flow.id} />

        {/* Metadata */}
        <div className="flex flex-wrap justify-between gap-3 pt-2 text-xs text-muted-foreground">
          <span>
            Created by{" "}
            <span className="text-foreground">
              {flow.createdBy?.name ?? flow.createdBy?.email ?? "Unknown"}
            </span>{" "}
            on {fmtDate(flow.createdAt)}
          </span>
          <span>Last updated {fmtDate(flow.updatedAt)}</span>
        </div>
      </div>
    </>
  );
}
