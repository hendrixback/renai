import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CommitImportButton } from "@/components/imports/commit-import-button";
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
import { getCurrentContext } from "@/lib/auth";
import { getImportConfig } from "@/lib/imports/configs/registry";
import type { RowError } from "@/lib/imports/types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PreviewImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx) redirect(`/login?from=/imports/sessions/${id}/preview`);

  const session = await prisma.importSession.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
  if (!session) notFound();

  const config = getImportConfig(session.module);
  if (!config) notFound();

  const errors = (session.errorReport ?? []) as RowError[];
  const isCommitted = session.status === "COMMITTED";
  const isCancelled = session.status === "CANCELLED";
  const isFailed = session.status === "FAILED";
  const canCommit = session.status === "VALIDATED" && session.validRows > 0;

  return (
    <>
      <PageHeader
        title="Preview & commit"
        breadcrumbs={[
          { label: "Imports", href: "/imports" },
          { label: config.label, href: "/imports" },
        ]}
        actions={
          !isCommitted && !isCancelled ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/imports/sessions/${session.id}/map`} />}
            >
              <ArrowLeftIcon className="mr-1.5 size-4" />
              Re-map columns
            </Button>
          ) : null
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Summary banner */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-full ${
                  isCommitted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : isFailed || isCancelled
                      ? "bg-destructive/10 text-destructive"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}
              >
                {isCommitted ? (
                  <CheckCircle2Icon className="size-5" />
                ) : isFailed || isCancelled ? (
                  <XCircleIcon className="size-5" />
                ) : (
                  <AlertTriangleIcon className="size-5" />
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{config.label}</p>
                <p className="font-mono text-sm">{session.filename}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-medium tabular-nums">{session.totalRows}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Valid</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {session.validRows}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Errors</p>
                <p className="text-destructive font-medium tabular-nums">
                  {errors.length}
                </p>
              </div>
              {isCommitted ? (
                <div>
                  <p className="text-muted-foreground text-xs">Committed</p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {session.committedRows}
                  </p>
                </div>
              ) : null}
              <Badge
                variant={
                  isCommitted
                    ? "default"
                    : isFailed || isCancelled
                      ? "destructive"
                      : "secondary"
                }
              >
                {session.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {session.errorMessage ? (
          <Card className="border-destructive/50">
            <CardContent className="text-destructive p-4 text-sm">
              {session.errorMessage}
            </CardContent>
          </Card>
        ) : null}

        {errors.length > 0 ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b p-4">
                <h3 className="font-medium">Validation errors</h3>
                <p className="text-muted-foreground text-sm">
                  Rows with errors are skipped. Fix the source file and re-upload, or
                  proceed and commit only the valid rows.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Row</TableHead>
                    <TableHead className="w-[180px]">Column</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.slice(0, 100).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {e.row || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{e.column ?? "—"}</TableCell>
                      <TableCell className="text-sm">{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {errors.length > 100 ? (
                <p className="text-muted-foreground border-t p-3 text-center text-xs">
                  Showing the first 100 of {errors.length} errors.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Commit action */}
        {canCommit ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-medium">Ready to commit</p>
                <p className="text-muted-foreground text-sm">
                  {session.validRows} row{session.validRows === 1 ? "" : "s"} will
                  be inserted into {config.label}.
                </p>
              </div>
              <CommitImportButton
                sessionId={session.id}
                count={session.validRows}
              />
            </CardContent>
          </Card>
        ) : isCommitted ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  Imported {session.committedRows} row
                  {session.committedRows === 1 ? "" : "s"}.
                </p>
                <p className="text-muted-foreground text-sm">
                  Open {config.label} to review the new records.
                </p>
              </div>
              <Button
                size="sm"
                render={<Link href={config.redirectAfterCommit} />}
              >
                Open {config.label}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
