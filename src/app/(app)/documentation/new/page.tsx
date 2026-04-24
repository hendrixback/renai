import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { UploadDocumentForm } from "@/components/documentation/upload-document-form";

export const dynamic = "force-dynamic";

export default async function UploadDocumentPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/documentation/new");

  const sites = await prisma.site.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Upload document"
        breadcrumbs={[{ label: "Documentation", href: "/documentation" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/documentation" />}
          >
            Back to list
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Attach an invoice, certificate, or other evidence. Max 50MB.
        </p>
        <UploadDocumentForm sites={sites} />
      </div>
    </>
  );
}
