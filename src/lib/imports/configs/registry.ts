import type { ImportConfig } from "../types";

import { wasteFlowsImportConfig } from "./waste-flows";
import { scope1ImportConfig } from "./scope-1";
import { scope2ImportConfig } from "./scope-2";
import { scope3ImportConfig } from "./scope-3";
import { productionImportConfig } from "./production-volumes";

/**
 * Registry of every importable module. Adding a new module is a
 * one-file affair: write a new ImportConfig and register it here.
 *
 * The keys here are the URL slugs (`/imports/[module]/upload`) and
 * the values stored in `ImportSession.module`.
 *
 * The map type is `ImportConfig<any>` to side-step TypeScript's
 * function contravariance: each module config is `ImportConfig<TRow>`
 * for its own row type, and storing them in a generic Record<string,
 * ImportConfig<unknown>> would error because `commit(rows: TRow[])`
 * isn't assignable to `commit(rows: unknown[])`. The engine validates
 * the row schema before invoking commit, so the runtime cast is safe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyImportConfig = ImportConfig<any>;

const ALL_CONFIGS: Record<string, AnyImportConfig> = {
  "waste-flows": wasteFlowsImportConfig,
  "scope-1": scope1ImportConfig,
  "scope-2": scope2ImportConfig,
  "scope-3": scope3ImportConfig,
  "production-volumes": productionImportConfig,
};

export const IMPORT_MODULES = Object.keys(ALL_CONFIGS);
export type ImportModuleKey = string;

export function getImportConfig(module: string): AnyImportConfig | null {
  return ALL_CONFIGS[module] ?? null;
}

export function isImportModule(module: string): boolean {
  return module in ALL_CONFIGS;
}
