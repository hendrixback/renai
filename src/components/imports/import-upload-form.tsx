"use client";

import Link from "next/link";
import { useActionState } from "react";
import { DownloadIcon, Loader2, UploadIcon } from "lucide-react";

import {
  uploadImportFile,
  type UploadState,
} from "@/app/(app)/imports/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const empty: UploadState = { error: null, fieldErrors: {} };

type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: string;
};

export function ImportUploadForm({
  module,
  label,
  description,
  fields,
  templateCsv,
}: {
  module: string;
  label: string;
  description: string;
  fields: ReadonlyArray<FieldDef>;
  templateCsv: string;
}) {
  const action = uploadImportFile.bind(null, module);
  const [state, formAction, pending] = useActionState(action, empty);

  // Build a data URL for the CSV template. Tiny strings — fine inline.
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    templateCsv,
  )}`;
  const templateFilename = `renai-${module}-template.csv`;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Upload {label} file</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">{description}</p>

          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="file">CSV or XLSX file</FieldLabel>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  required
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                />
                {state.fieldErrors.file ? (
                  <p className="text-sm text-destructive">
                    {state.fieldErrors.file[0]}
                  </p>
                ) : null}
              </Field>

              {state.error ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
            </FieldGroup>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                disabled={pending}
                render={<Link href="/imports">Cancel</Link>}
              />
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-4" />
                    Upload & continue
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Expected columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1.5">
            {fields.map((f) => (
              <li key={f.key} className="flex items-baseline gap-2">
                <span className="font-medium">{f.label}</span>
                {f.required ? (
                  <span className="text-xs text-destructive">required</span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    optional
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            Header order doesn&apos;t matter — you&apos;ll map columns in the next
            step. Common header aliases (e.g. &quot;qty&quot; → Quantity) are
            auto-detected.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            render={
              <a href={templateHref} download={templateFilename}>
                <DownloadIcon className="size-4" />
                Download CSV template
              </a>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
