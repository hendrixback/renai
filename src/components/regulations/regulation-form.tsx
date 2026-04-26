"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import {
  createRegulation,
  updateRegulation,
  type RegulationActionState,
} from "@/app/(app)/regulations/actions";
import {
  GEOGRAPHY_SUGGESTIONS,
  REGULATION_PRIORITY_LABELS,
  REGULATION_STATUS_LABELS,
  REGULATION_TOPIC_LABELS,
  REGULATION_TYPE_LABELS,
} from "@/components/regulations/labels";
import {
  REGULATION_PRIORITIES,
  REGULATION_STATUSES,
  REGULATION_TOPICS,
  REGULATION_TYPES,
  type RegulationPriorityValue,
  type RegulationStatusValue,
  type RegulationTopicValue,
  type RegulationTypeValue,
} from "@/lib/schemas/regulation.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Member = { id: string; name: string | null; email: string };

export type RegulationFormInitial = {
  id: string;
  title: string;
  type: RegulationTypeValue;
  geography: string;
  topic: RegulationTopicValue;
  summary: string;
  sourceReference: string | null;
  effectiveDate: string | null; // YYYY-MM-DD
  regulatoryStatus: RegulationStatusValue;
  appliesToUs: boolean;
  priorityLevel: RegulationPriorityValue;
  internalNotes: string | null;
  reviewedById: string | null;
  reviewDate: string | null; // YYYY-MM-DD
};

const empty: RegulationActionState = {
  error: null,
  success: null,
  fieldErrors: {},
};

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function RegulationForm({
  members,
  initial,
}: {
  members: ReadonlyArray<Member>;
  initial?: RegulationFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const cancelHref = isEdit
    ? `/regulations/${initial!.id}`
    : "/regulations";

  const action = isEdit
    ? updateRegulation.bind(null, initial!.id)
    : createRegulation;
  const [state, formAction, pending] = useActionState(action, empty);

  // Bounce the user back on success.
  useEffect(() => {
    if (state.success) {
      const target = isEdit
        ? `/regulations/${initial!.id}`
        : "/regulations";
      const t = setTimeout(() => {
        router.push(target);
        router.refresh();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [state.success, router, isEdit, initial]);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit regulation" : "New regulation"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                name="title"
                required
                defaultValue={initial?.title}
                placeholder="e.g. CSRD — Corporate Sustainability Reporting Directive"
                maxLength={200}
              />
              <FieldError errors={state.fieldErrors.title} />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <select
                  id="type"
                  name="type"
                  defaultValue={initial?.type ?? "EU_REGULATION"}
                  className={selectClass}
                >
                  {REGULATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {REGULATION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.fieldErrors.type} />
              </Field>
              <Field>
                <FieldLabel htmlFor="topic">Topic</FieldLabel>
                <select
                  id="topic"
                  name="topic"
                  defaultValue={initial?.topic ?? "ESG_REPORTING"}
                  className={selectClass}
                >
                  {REGULATION_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {REGULATION_TOPIC_LABELS[t]}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.fieldErrors.topic} />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="geography">Geography</FieldLabel>
                <Input
                  id="geography"
                  name="geography"
                  required
                  defaultValue={initial?.geography ?? "EU"}
                  list="geography-suggestions"
                  maxLength={40}
                  placeholder="EU, PT, ES, GLOBAL…"
                />
                <datalist id="geography-suggestions">
                  {GEOGRAPHY_SUGGESTIONS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                <FieldError errors={state.fieldErrors.geography} />
              </Field>
              <Field>
                <FieldLabel htmlFor="effectiveDate">Effective date</FieldLabel>
                <Input
                  id="effectiveDate"
                  name="effectiveDate"
                  type="date"
                  defaultValue={initial?.effectiveDate ?? ""}
                />
                <FieldError errors={state.fieldErrors.effectiveDate} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="summary">Summary</FieldLabel>
              <Textarea
                id="summary"
                name="summary"
                required
                rows={5}
                defaultValue={initial?.summary}
                placeholder="Plain-English summary of what the rule requires and who it applies to."
                maxLength={5000}
              />
              <FieldError errors={state.fieldErrors.summary} />
            </Field>

            <Field>
              <FieldLabel htmlFor="sourceReference">
                Source reference (URL or citation)
              </FieldLabel>
              <Input
                id="sourceReference"
                name="sourceReference"
                defaultValue={initial?.sourceReference ?? ""}
                placeholder="https://eur-lex.europa.eu/… or CELEX number"
                maxLength={500}
              />
              <FieldError errors={state.fieldErrors.sourceReference} />
            </Field>

            <div className="grid gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="regulatoryStatus">Status</FieldLabel>
                <select
                  id="regulatoryStatus"
                  name="regulatoryStatus"
                  defaultValue={initial?.regulatoryStatus ?? "IN_FORCE"}
                  className={selectClass}
                >
                  {REGULATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {REGULATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.fieldErrors.regulatoryStatus} />
              </Field>
              <Field>
                <FieldLabel htmlFor="priorityLevel">Priority</FieldLabel>
                <select
                  id="priorityLevel"
                  name="priorityLevel"
                  defaultValue={initial?.priorityLevel ?? "MEDIUM"}
                  className={selectClass}
                >
                  {REGULATION_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {REGULATION_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.fieldErrors.priorityLevel} />
              </Field>
              <Field>
                <FieldLabel htmlFor="appliesToUs">Applies to us</FieldLabel>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    id="appliesToUs"
                    name="appliesToUs"
                    defaultChecked={initial?.appliesToUs ?? false}
                  />
                  <span className="text-muted-foreground text-sm">
                    Toggle if this rule applies to your operations.
                  </span>
                </div>
                <FieldError errors={state.fieldErrors.appliesToUs} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="internalNotes">Internal notes</FieldLabel>
              <Textarea
                id="internalNotes"
                name="internalNotes"
                rows={4}
                defaultValue={initial?.internalNotes ?? ""}
                placeholder="Internal commentary, owner, deadlines, gaps, action items…"
                maxLength={5000}
              />
              <FieldError errors={state.fieldErrors.internalNotes} />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reviewedById">Reviewed by</FieldLabel>
                <select
                  id="reviewedById"
                  name="reviewedById"
                  defaultValue={initial?.reviewedById ?? ""}
                  className={selectClass}
                >
                  <option value="">— Not reviewed —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </option>
                  ))}
                </select>
                <FieldError errors={state.fieldErrors.reviewedById} />
              </Field>
              <Field>
                <FieldLabel htmlFor="reviewDate">Review date</FieldLabel>
                <Input
                  id="reviewDate"
                  name="reviewDate"
                  type="date"
                  defaultValue={initial?.reviewDate ?? ""}
                />
                <FieldError errors={state.fieldErrors.reviewDate} />
              </Field>
            </div>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {state.success}
              </p>
            ) : null}
          </FieldGroup>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={pending}
              render={<Link href={cancelHref}>Cancel</Link>}
            />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create regulation"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
