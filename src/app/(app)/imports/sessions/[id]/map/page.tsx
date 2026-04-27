import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ColumnMapper } from "@/components/imports/column-mapper";
import { getCurrentContext } from "@/lib/auth";
import { getImportConfig } from "@/lib/imports/configs/registry";
import type { ColumnMap } from "@/lib/imports/types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MapImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx) redirect(`/login?from=/imports/sessions/${id}/map`);

  const session = await prisma.importSession.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!session) notFound();

  const config = getImportConfig(session.module);
  if (!config) notFound();

  if (session.status === "COMMITTED" || session.status === "CANCELLED") {
    redirect(`/imports/sessions/${session.id}/preview`);
  }

  const initialMap = (session.columnMap ?? {}) as ColumnMap;

  return (
    <>
      <PageHeader
        title="Map columns"
        breadcrumbs={[
          { label: "Imports", href: "/imports" },
          { label: config.label, href: "/imports" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Match the columns from <span className="font-medium">{session.filename}</span>{" "}
          ({session.totalRows} row{session.totalRows === 1 ? "" : "s"}) to the
          fields {config.label} expects. Auto-detected matches are shown in
          green; required fields without a match are in red.
        </p>

        <ColumnMapper
          sessionId={session.id}
          headers={session.headers}
          fields={config.fields.map((f) => ({
            key: f.key,
            label: f.label,
            required: f.required,
            description: f.description,
          }))}
          initialMap={initialMap}
        />
      </div>
    </>
  );
}
