"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilIcon } from "lucide-react";

import {
  updateDocument,
  type UpdateDocumentState,
} from "@/app/(app)/documentation/actions";
import { DOCUMENT_TYPES } from "@/lib/schemas/document.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Site = { id: string; name: string };

type Document = {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[];
  documentType: string;
  department: string | null;
  reportingYear: number | null;
  reportingMonth: number | null;
  plantId: string | null;
};

const emptyState: UpdateDocumentState = {
  error: null,
  success: null,
  fieldErrors: {},
};

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

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function EditDocumentDialog({
  document,
  sites,
}: {
  document: Document;
  sites: Site[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<UpdateDocumentState>(emptyState);
  const [pending, startTransition] = React.useTransition();

  const [title, setTitle] = React.useState(document.title ?? "");
  const [description, setDescription] = React.useState(document.description ?? "");
  const [tagsInput, setTagsInput] = React.useState(document.tags.join(", "));
  const [documentType, setDocumentType] = React.useState(document.documentType);
  const [department, setDepartment] = React.useState(document.department ?? "");
  const [reportingYear, setReportingYear] = React.useState(
    document.reportingYear?.toString() ?? "",
  );
  const [reportingMonth, setReportingMonth] = React.useState(
    document.reportingMonth?.toString() ?? "",
  );
  const [plantId, setPlantId] = React.useState(document.plantId ?? "");

  function reset() {
    setTitle(document.title ?? "");
    setDescription(document.description ?? "");
    setTagsInput(document.tags.join(", "));
    setDocumentType(document.documentType);
    setDepartment(document.department ?? "");
    setReportingYear(document.reportingYear?.toString() ?? "");
    setReportingMonth(document.reportingMonth?.toString() ?? "");
    setPlantId(document.plantId ?? "");
    setState(emptyState);
  }

  function handleSave() {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const payload: Record<string, unknown> = {
      documentId: document.id,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      tags,
      documentType,
      department: department.trim() || undefined,
      plantId: plantId || undefined,
    };
    if (reportingYear) payload.reportingYear = Number(reportingYear);
    if (reportingMonth) payload.reportingMonth = Number(reportingMonth);

    startTransition(async () => {
      const result = await updateDocument(payload);
      setState(result);
      if (result.success) {
        router.refresh();
        setTimeout(() => setOpen(false), 400);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PencilIcon className="size-4" />
            Edit
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit document metadata</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to use the filename"
            />
            <FieldError errors={state.fieldErrors.title} />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <FieldError errors={state.fieldErrors.description} />
          </Field>

          <Field>
            <FieldLabel htmlFor="tags">Tags (comma-separated)</FieldLabel>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. 2025, Q1, audit"
            />
            <FieldError errors={state.fieldErrors.tags} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="documentType">Type</FieldLabel>
              <select
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className={selectClass}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors.documentType} />
            </Field>
            <Field>
              <FieldLabel htmlFor="department">Department</FieldLabel>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.department} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="reportingYear">Year</FieldLabel>
              <Input
                id="reportingYear"
                type="number"
                min={2000}
                max={2100}
                value={reportingYear}
                onChange={(e) => setReportingYear(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.reportingYear} />
            </Field>
            <Field>
              <FieldLabel htmlFor="reportingMonth">Month</FieldLabel>
              <select
                id="reportingMonth"
                value={reportingMonth}
                onChange={(e) => setReportingMonth(e.target.value)}
                className={selectClass}
              >
                <option value="">—</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors.reportingMonth} />
            </Field>
            <Field>
              <FieldLabel htmlFor="plantId">Plant</FieldLabel>
              <select
                id="plantId"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                className={selectClass}
              >
                <option value="">— None —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FieldError errors={state.fieldErrors.plantId} />
            </Field>
          </div>

          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </FieldGroup>

        <DialogFooter className="mt-6">
          <DialogClose
            render={
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={handleSave} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
