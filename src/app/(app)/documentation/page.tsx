import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { getCurrentContext } from "@/lib/auth";
import { DocumentService } from "@/lib/services/documents";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DocumentsList } from "@/components/documentation/documents-list";

export const dynamic = "force-dynamic";

export default async function DocumentationPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login?from=/documentation");

  const documents = await DocumentService.listByCompany(ctx, {
    limit: 100,
  });

  return (
    <>
      <PageHeader
        title="Documentation"
        actions={
          <Button size="sm" render={<Link href="/documentation/new" />}>
            <PlusIcon className="mr-1.5 size-4" />
            Upload document
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          All evidence uploaded across the platform — invoices, waste
          certificates, audit packs.
        </p>
        <DocumentsList documents={documents} />
      </div>
    </>
  );
}
