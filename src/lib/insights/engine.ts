import "server-only";

import { dataQualityGenerator } from "./generators/data-quality";
import { emissionsTrendsGenerator } from "./generators/emissions-trends";
import { operationsGenerator } from "./generators/operations";
import { topContributorsGenerator } from "./generators/top-contributors";
import {
  compareInsights,
  type Insight,
  type InsightGenerator,
  type InsightGeneratorContext,
} from "./types";

/**
 * Insights engine — orchestrates all rules-based generators in
 * parallel and returns a single sorted list. New generators register
 * by appending to the array below; nothing else needs to change.
 *
 * A failing generator is logged + swallowed so one buggy rule doesn't
 * blank the whole insights panel.
 */

const GENERATORS: InsightGenerator[] = [
  dataQualityGenerator,
  emissionsTrendsGenerator,
  topContributorsGenerator,
  operationsGenerator,
];

export async function generateInsights(
  ctx: InsightGeneratorContext,
): Promise<Insight[]> {
  const results = await Promise.allSettled(
    GENERATORS.map((g) => g(ctx)),
  );

  const insights: Insight[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      insights.push(...r.value);
    } else {
      // Logged but not surfaced — a broken rule shouldn't take the
      // dashboard down. Sentry catches the rejection via instrumentation.
      console.error("[insights] generator failed:", r.reason);
    }
  }

  return insights.sort(compareInsights);
}

export type { Insight, InsightSeverity, InsightCategory } from "./types";
