import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  UploadIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentContext } from "@/lib/auth";
import {
  IMPORT_MODULES,
  getImportConfig,
} from "@/lib/imports/configs/registry";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  UPLOADED: "outline",
  PARSED: "outline",
  VALIDATED: "secondary",
  COMMITTING: "secondary",
  COMMITTED: "default",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export default async function ImportsIndexPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/imports");

  const sessions = await prisma.importSession.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      uploadedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <>
      <PageHeader title="Imports" />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Bulk-import data from CSV or Excel. Pick a target module, map your
          column headers, preview the validation report, and commit.
        </p>

        {/* Module picker */}
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Start a new import
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_MODULES.map((m) => {
              const config = getImportConfig(m)!;
              return (
                <Card key={m} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSpreadsheetIcon className="text-muted-foreground size-4" />
                      {config.label}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {config.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      className="w-full"
                      render={
                        <Link href={`/imports/${config.module}/new`}>
                          <UploadIcon className="size-4" />
                          Upload file
                          <ArrowRightIcon className="ml-auto size-4" />
                        </Link>
                      }
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Recent imports
          </h2>
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground p-8 text-center text-sm">
                No imports yet. Pick a module above to start.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => {
                    const config = getImportConfig(s.module);
                    const detailHref =
                      s.status === "COMMITTED" || s.status === "CANCELLED"
                        ? `/imports/sessions/${s.id}/preview`
                        : s.status === "PARSED"
                          ? `/imports/sessions/${s.id}/map`
                          : `/imports/sessions/${s.id}/preview`;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          <Link href={detailHref} className="hover:underline">
                            {s.filename}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {config?.label ?? s.module}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.uploadedBy?.name ?? s.uploadedBy?.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {s.createdAt.toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {s.committedRows > 0
                            ? `${s.committedRows} / ${s.totalRows}`
                            : `${s.totalRows}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={detailHref}
                            className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center"
                          >
                            <ChevronRightIcon className="size-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
