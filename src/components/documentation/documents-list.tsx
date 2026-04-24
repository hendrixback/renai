import Link from "next/link";
import { DownloadIcon, FileIcon } from "lucide-react";

import type { Document } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/lib/format/bytes";

export function DocumentsList({
  documents,
}: {
  documents: Document[];
}) {
  if (documents.length === 0) {
    return (
      <div className="bg-muted/50 flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl p-8 text-center">
        <FileIcon className="text-muted-foreground/60 size-10" />
        <div>
          <p className="font-medium">No documents yet</p>
          <p className="text-muted-foreground text-sm">
            Upload an invoice, waste certificate, or audit evidence to get
            started.
          </p>
        </div>
        <Button size="sm" render={<Link href="/documentation/new" />}>
          Upload document
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-[64px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {doc.title ?? doc.originalFilename}
                  </span>
                  {doc.title && doc.title !== doc.originalFilename ? (
                    <span className="text-muted-foreground text-xs">
                      {doc.originalFilename}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {formatDocumentType(doc.documentType)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatReportingPeriod(doc.reportingYear, doc.reportingMonth)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {formatBytes(doc.size)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {doc.createdAt.toISOString().slice(0, 10)}
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Download ${doc.originalFilename}`}
                  render={<Link href={`/documentation/${doc.id}/download`} />}
                >
                  <DownloadIcon className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatDocumentType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatReportingPeriod(
  year: number | null,
  month: number | null,
): string {
  if (!year) return "—";
  if (!month) return String(year);
  const m = String(month).padStart(2, "0");
  return `${year}-${m}`;
}
