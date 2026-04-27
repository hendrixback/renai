import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenIcon, PlusIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import {
  REGULATION_PRIORITY_LABELS,
  REGULATION_STATUS_LABELS,
  REGULATION_TOPIC_LABELS,
  REGULATION_TYPE_LABELS,
  priorityVariant,
  statusVariant,
} from "@/components/regulations/labels";
import { RegulationsFilters } from "@/components/regulations/regulations-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { listRegulationsParamsSchema } from "@/lib/schemas/regulation.schema";
import { RegulationsService } from "@/lib/services/regulations";

export const dynamic = "force-dynamic";

export default async function RegulationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/regulations");

  const raw = await searchParams;
  // Normalise to flat string entries (drop arrays, undefined).
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) flat[k] = v;
  }
  const parsed = listRegulationsParamsSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : {};

  const regs = await RegulationsService.list(ctx, params);
  const canManage = hasRole(ctx, "ADMIN");
  const hasActiveFilters = Object.keys(params).length > 0;

  return (
    <>
      <PageHeader
        title="Regulations"
        actions={
          canManage ? (
            <Button size="sm" render={<Link href="/regulations/new" />}>
              <PlusIcon className="size-4" />
              New regulation
            </Button>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Curated EU + national environmental regulations relevant to your
          operations. Per Spec §16.3 this is an information hub, not legal
          advice. AI-generated content is intentionally out of MVP.
        </p>

        <RegulationsFilters />

        <Card className="gap-0 overflow-hidden">
          <CardContent className="p-0">
            {regs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                <BookOpenIcon className="text-muted-foreground/60 size-10" />
                <p className="font-medium">
                  {hasActiveFilters
                    ? "No regulations match these filters."
                    : "No regulations yet."}
                </p>
                <p className="text-muted-foreground text-sm">
                  {hasActiveFilters
                    ? "Adjust or clear the filters above."
                    : canManage
                      ? "Click New regulation to add one."
                      : "Ask an Admin to add the first regulation."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Geography</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Applies</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/regulations/${r.id}`}
                          className="hover:underline"
                        >
                          {r.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {REGULATION_TYPE_LABELS[r.type]}
                      </TableCell>
                      <TableCell className="text-sm">
                        {REGULATION_TOPIC_LABELS[r.topic]}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {r.geography}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.effectiveDate
                          ? r.effectiveDate.toISOString().slice(0, 10)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.regulatoryStatus)}>
                          {REGULATION_STATUS_LABELS[r.regulatoryStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant(r.priorityLevel)}>
                          {REGULATION_PRIORITY_LABELS[r.priorityLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.appliesToUs ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
