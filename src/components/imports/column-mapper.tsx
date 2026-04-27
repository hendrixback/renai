"use client";

import { useState, useTransition } from "react";
import { CheckIcon, Loader2, MinusCircleIcon } from "lucide-react";

import { confirmColumnMap } from "@/app/(app)/imports/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ColumnMap } from "@/lib/imports/types";

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export type MapperFieldDef = {
  key: string;
  label: string;
  required: boolean;
  description?: string;
};

export function ColumnMapper({
  sessionId,
  headers,
  fields,
  initialMap,
}: {
  sessionId: string;
  headers: string[];
  fields: MapperFieldDef[];
  initialMap: ColumnMap;
}) {
  const [map, setMap] = useState<ColumnMap>(initialMap);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function setField(key: string, value: string) {
    setMap((prev) => ({ ...prev, [key]: value === "" ? null : value }));
  }

  const requiredMissing = fields
    .filter((f) => f.required && !map[f.key])
    .map((f) => f.label);

  function handleSubmit() {
    if (requiredMissing.length > 0) {
      setError(
        `Map a column to: ${requiredMissing.join(", ")} before continuing.`,
      );
      return;
    }
    setError(null);
    start(async () => {
      const result = await confirmColumnMap(sessionId, map);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-3">
          {fields.map((f) => {
            const value = map[f.key] ?? "";
            const isMapped = Boolean(value);
            const isReqUnmapped = f.required && !isMapped;
            return (
              <div
                key={f.key}
                className={`grid grid-cols-[1fr_auto_320px] items-center gap-3 rounded-md border p-3 ${
                  isReqUnmapped
                    ? "border-destructive/40 bg-destructive/5"
                    : isMapped
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border"
                }`}
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{f.label}</span>
                    {f.required ? (
                      <span className="text-xs text-destructive">required</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        optional
                      </span>
                    )}
                  </div>
                  {f.description ? (
                    <p className="text-muted-foreground text-xs">
                      {f.description}
                    </p>
                  ) : null}
                </div>
                {isMapped ? (
                  <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <MinusCircleIcon className="text-muted-foreground/60 size-4" />
                )}
                <select
                  value={value}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={selectClass}
                >
                  <option value="">— Not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Validating…
              </>
            ) : (
              "Confirm mapping & validate"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
