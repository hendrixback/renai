import Link from "next/link";
import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  BellIcon,
  CheckCircle2Icon,
  InfoIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Insight, InsightSeverity } from "@/lib/insights/engine";

/**
 * Server-rendered insights panel (Spec §19.6 — rules-based, no LLM).
 *
 * Splits the list visually by severity so the user's eye lands on the
 * highest-impact items first. An empty list is itself a positive
 * signal — we render an "all clear" state rather than nothing.
 */
const SEV_BADGE: Record<
  InsightSeverity,
  { icon: typeof AlertOctagonIcon; tone: string; label: string }
> = {
  critical: {
    icon: AlertOctagonIcon,
    tone: "border-destructive/40 bg-destructive/5 text-destructive",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangleIcon,
    tone:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    label: "Needs attention",
  },
  info: {
    icon: InfoIcon,
    tone: "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400",
    label: "Heads-up",
  },
};

function InsightRow({ insight }: { insight: Insight }) {
  const meta = SEV_BADGE[insight.severity];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        meta.tone,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{insight.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {insight.message}
        </p>
      </div>
      {insight.href ? (
        <Link
          href={insight.href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-center text-xs font-medium hover:underline"
        >
          {insight.ctaLabel ?? "View"}
          <ArrowRightIcon className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wide">
            All clear
          </p>
          <p className="text-muted-foreground text-sm">
            No data-quality, compliance, or trend issues detected. Keep
            shipping.
          </p>
        </div>
      </div>
    );
  }

  // Cap to 8 to keep the dashboard breathable; full list lives on
  // /analysis (a future deep-dive view can show everything).
  const visible = insights.slice(0, 8);
  const overflow = insights.length - visible.length;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <BellIcon className="text-muted-foreground size-4" />
        <h3 className="text-foreground text-sm font-semibold">
          Insights
        </h3>
        <span className="text-muted-foreground text-xs">
          {insights.length} signal{insights.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {visible.map((i) => (
          <li key={i.id}>
            <InsightRow insight={i} />
          </li>
        ))}
      </ul>
      {overflow > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          {overflow} more item{overflow === 1 ? "" : "s"} not shown.
        </p>
      ) : null}
    </div>
  );
}
