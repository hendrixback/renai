import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentTypeSchema } from "@/lib/schemas/document.schema";
import { DocumentService } from "@/lib/services/documents";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ExportMenu } from "@/components/export-menu";
import { serializeSearchParams } from "@/lib/url";
import { DocumentsFilters } from "@/components/documentation/documents-filters";
import { DocumentsList } from "@/components/documentation/documents-list";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  type?: string;
  plant?: string;
  year?: string;
};

export default async function DocumentationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/documentation");

  const sp = await searchParams;

  // Parse filters defensively — bad values are simply ignored rather than
  // raising a visible error, so a user can't get stuck with a broken URL.
  const typeParsed = sp.type
    ? documentTypeSchema.safeParse(sp.type)
    : null;
  const year = sp.year ? Number.parseInt(sp.year, 10) : undefined;

  const [documents, sites] = await Promise.all([
    DocumentService.listByCompany(ctx, {
      limit: 100,
      documentType: typeParsed?.success ? typeParsed.data : undefined,
      plantId:
        typeof sp.plant === "string" && sp.plant ? sp.plant : undefined,
      reportingYear:
        typeof year === "number" && Number.isFinite(year) ? year : undefined,
      query:
        typeof sp.q === "string" && sp.q.trim().length > 0
          ? sp.q.trim()
          : undefined,
    }),
    prisma.site.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Documentation"
        actions={
          <>
            <ExportMenu
              basePath="/documentation/export"
              searchString={serializeSearchParams(sp)}
            />
            <Button size="sm" render={<Link href="/documentation/new" />}>
              <PlusIcon className="mr-1.5 size-4" />
              Upload document
            </Button>
          </>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentsFilters sites={sites} />
        <p className="text-muted-foreground text-xs">
          {documents.length} {documents.length === 1 ? "document" : "documents"}
        </p>
        <DocumentsList documents={documents} />
      </div>
    </>
  );
}
