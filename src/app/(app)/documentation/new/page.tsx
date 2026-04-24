import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentModuleSchema } from "@/lib/schemas/document.schema";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { UploadDocumentForm } from "@/components/documentation/upload-document-form";

export const dynamic = "force-dynamic";

type SearchParams = {
  linkModule?: string;
  linkRecordId?: string;
  redirectTo?: string;
};

/**
 * Strip any redirectTo that isn't a local path (no external hosts, no
 * protocol-relative URLs). Belt-and-braces against open-redirect abuse.
 */
function safeRedirectTo(raw?: string): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export default async function UploadDocumentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/documentation/new");

  const sp = await searchParams;

  // Validate linkModule against the enum — an invalid value simply
  // drops the link (no error) so the user can still upload.
  const moduleParse = sp.linkModule
    ? documentModuleSchema.safeParse(sp.linkModule)
    : null;
  const linkModule = moduleParse?.success ? moduleParse.data : undefined;
  const linkRecordId =
    linkModule && typeof sp.linkRecordId === "string" && sp.linkRecordId
      ? sp.linkRecordId
      : undefined;
  const redirectTo = safeRedirectTo(sp.redirectTo);

  const sites = await prisma.site.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const backHref = redirectTo ?? "/documentation";

  return (
    <>
      <PageHeader
        title="Upload document"
        breadcrumbs={[{ label: "Documentation", href: "/documentation" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={backHref} />}
          >
            Cancel
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Attach an invoice, certificate, or other evidence. Max 50MB.
        </p>
        <UploadDocumentForm
          sites={sites}
          linkModule={linkModule}
          linkRecordId={linkRecordId}
          redirectTo={redirectTo}
        />
      </div>
    </>
  );
}
