"use client";

import { DownloadIcon, FileDownIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  basePath: string;
  /**
   * Pre-serialized filter query string (without the leading "?"). The page is
   * a Server Component that already knows its applied filters, so it passes
   * them down — no `useSearchParams` needed, no Suspense boundary required.
   */
  searchString?: string;
  label?: string;
};

function buildHref(basePath: string, searchString: string | undefined, format: string): string {
  const params = new URLSearchParams(searchString ?? "");
  params.set("format", format);
  return `${basePath}?${params.toString()}`;
}

export function ExportMenu({ basePath, searchString, label = "Export" }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline">
            <DownloadIcon />
            {label}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Download current view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href={buildHref(basePath, searchString, "csv")} download />}>
          <FileTextIcon />
          CSV
          <span className="ml-auto text-xs text-muted-foreground">.csv</span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={buildHref(basePath, searchString, "xlsx")} download />}>
          <FileSpreadsheetIcon />
          Excel
          <span className="ml-auto text-xs text-muted-foreground">.xlsx</span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={buildHref(basePath, searchString, "pdf")} download />}>
          <FileDownIcon />
          PDF
          <span className="ml-auto text-xs text-muted-foreground">.pdf</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

