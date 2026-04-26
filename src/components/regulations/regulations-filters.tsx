"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
} from "@/lib/schemas/regulation.schema";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * URL-driven filters for the Regulations list. Each control writes
 * its value into the query string and the server page re-renders with
 * the new where-clause. Pure client component — no state beyond
 * `useTransition` for the spinner during navigation.
 */
export function RegulationsFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    start(() => router.push(`/regulations?${next.toString()}`));
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <Input
        placeholder="Search title, summary, source…"
        className="h-9 max-w-xs"
        defaultValue={params.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setParam("q", (e.target as HTMLInputElement).value.trim());
          }
        }}
      />

      <select
        className={`${selectClass} max-w-[180px]`}
        value={params.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
      >
        <option value="">All types</option>
        {REGULATION_TYPES.map((t) => (
          <option key={t} value={t}>
            {REGULATION_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      <select
        className={`${selectClass} max-w-[180px]`}
        value={params.get("topic") ?? ""}
        onChange={(e) => setParam("topic", e.target.value)}
      >
        <option value="">All topics</option>
        {REGULATION_TOPICS.map((t) => (
          <option key={t} value={t}>
            {REGULATION_TOPIC_LABELS[t]}
          </option>
        ))}
      </select>

      <select
        className={`${selectClass} max-w-[140px]`}
        value={params.get("geography") ?? ""}
        onChange={(e) => setParam("geography", e.target.value)}
      >
        <option value="">All geographies</option>
        {GEOGRAPHY_SUGGESTIONS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        className={`${selectClass} max-w-[160px]`}
        value={params.get("regulatoryStatus") ?? ""}
        onChange={(e) => setParam("regulatoryStatus", e.target.value)}
      >
        <option value="">Any status</option>
        {REGULATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {REGULATION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        className={`${selectClass} max-w-[140px]`}
        value={params.get("priorityLevel") ?? ""}
        onChange={(e) => setParam("priorityLevel", e.target.value)}
      >
        <option value="">Any priority</option>
        {REGULATION_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {REGULATION_PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>

      <select
        className={`${selectClass} max-w-[160px]`}
        value={params.get("appliesToUs") ?? ""}
        onChange={(e) => setParam("appliesToUs", e.target.value)}
      >
        <option value="">Applies to us — any</option>
        <option value="true">Applies to us</option>
        <option value="false">Does not apply</option>
      </select>
    </div>
  );
}
