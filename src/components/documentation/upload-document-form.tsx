"use client";

import { useActionState } from "react";

import {
  uploadDocument,
  type UploadDocumentState,
} from "@/app/(app)/documentation/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_TYPES,
  type DocumentModule,
} from "@/lib/schemas/document.schema";

const initialState: UploadDocumentState = {
  error: null,
  success: null,
  documentId: null,
  fieldErrors: {},
};

type Site = { id: string; name: string };

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  WASTE_CERTIFICATE: "Waste certificate",
  COLLECTION_RECEIPT: "Collection receipt",
  FUEL_BILL: "Fuel bill",
  ELECTRICITY_BILL: "Electricity bill",
  SUPPLIER_DOCUMENT: "Supplier document",
  INTERNAL_REPORT: "Internal report",
  AUDIT_EVIDENCE: "Audit evidence",
  ENVIRONMENTAL_LICENSE: "Environmental license",
  CONTRACT: "Contract",
  EMISSIONS_EVIDENCE: "Emissions evidence",
  PRODUCTION_REPORT: "Production report",
  REGULATORY_FILE: "Regulatory file",
  OTHER: "Other",
};

export function UploadDocumentForm({
  sites,
  linkModule,
  linkRecordId,
  redirectTo,
}: {
  sites: Site[];
  /** When set, the upload atomically links the new doc to this record. */
  linkModule?: DocumentModule;
  linkRecordId?: string;
  /** Where the server action redirects after a successful upload. */
  redirectTo?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    uploadDocument,
    initialState,
  );

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form action={formAction} className="flex flex-col gap-5">
          {linkModule ? (
            <input type="hidden" name="linkModule" value={linkModule} />
          ) : null}
          {linkRecordId ? (
            <input type="hidden" name="linkRecordId" value={linkRecordId} />
          ) : null}
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}

          {state.error ? (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            >
              {state.error}
            </div>
          ) : null}

          <FormRow
            label="File"
            htmlFor="file"
            error={state.fieldErrors.file?.[0]}
            hint="Max 50 MB. PDF, image, Excel, Word, CSV, or plain text."
          >
            <Input
              id="file"
              name="file"
              type="file"
              required
              accept="application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/csv,text/plain"
            />
          </FormRow>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormRow
              label="Document type"
              htmlFor="documentType"
              error={state.fieldErrors.documentType?.[0]}
            >
              <Select name="documentType" defaultValue="OTHER">
                <SelectTrigger id="documentType">
                  <SelectValue>
                    {(raw) => {
                      const v = typeof raw === "string" ? raw : "";
                      return DOCUMENT_TYPE_LABELS[v] ?? v;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow
              label="Plant / location"
              htmlFor="plantId"
              error={state.fieldErrors.plantId?.[0]}
            >
              <Select name="plantId">
                <SelectTrigger id="plantId">
                  <SelectValue placeholder="Not specified">
                    {(raw) => {
                      const v = typeof raw === "string" ? raw : "";
                      if (!v) {
                        return (
                          <span className="text-muted-foreground">Not specified</span>
                        );
                      }
                      return sites.find((s) => s.id === v)?.name ?? v;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sites.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No sites yet
                    </SelectItem>
                  ) : (
                    sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <FormRow
            label="Title (optional)"
            htmlFor="title"
            error={state.fieldErrors.title?.[0]}
            hint="Defaults to the original filename if left blank."
          >
            <Input
              id="title"
              name="title"
              type="text"
              maxLength={200}
              placeholder="e.g. Diesel invoice — January 2026"
            />
          </FormRow>

          <FormRow
            label="Description (optional)"
            htmlFor="description"
            error={state.fieldErrors.description?.[0]}
          >
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="Notes, context, anything that helps find this later."
            />
          </FormRow>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormRow
              label="Reporting year"
              htmlFor="reportingYear"
              error={state.fieldErrors.reportingYear?.[0]}
            >
              <Input
                id="reportingYear"
                name="reportingYear"
                type="number"
                min={2000}
                max={2100}
                placeholder="2026"
              />
            </FormRow>
            <FormRow
              label="Reporting month"
              htmlFor="reportingMonth"
              error={state.fieldErrors.reportingMonth?.[0]}
            >
              <Input
                id="reportingMonth"
                name="reportingMonth"
                type="number"
                min={1}
                max={12}
                placeholder="1–12"
              />
            </FormRow>
            <FormRow
              label="Department"
              htmlFor="department"
              error={state.fieldErrors.department?.[0]}
            >
              <Input
                id="department"
                name="department"
                type="text"
                maxLength={100}
                placeholder="e.g. Operations"
              />
            </FormRow>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FormRow({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
