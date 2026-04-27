import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ImportUploadForm } from "@/components/imports/import-upload-form";
import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { getImportConfig } from "@/lib/imports/configs/registry";

export const dynamic = "force-dynamic";

export default async function NewImportPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const config = getImportConfig(module);
  if (!config) notFound();

  const ctx = await getCurrentContext();
  if (!ctx) redirect(`/login?from=/imports/${module}/new`);
  if (!hasRole(ctx, "MEMBER")) redirect("/imports");

  return (
    <>
      <PageHeader
        title={`Import — ${config.label}`}
        breadcrumbs={[{ label: "Imports", href: "/imports" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ImportUploadForm
          module={config.module}
          label={config.label}
          description={config.description}
          fields={config.fields}
          templateCsv={config.templateCsv}
        />
      </div>
    </>
  );
}
