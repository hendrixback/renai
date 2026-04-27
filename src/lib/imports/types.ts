import type { z } from "zod";

/**
 * Spec §20 — types shared by the generic import engine and per-module
 * configs. Every module that wants to be imported (waste-flows, Scope
 * 1/2/3, production-volumes) registers a config here.
 */

export type FieldType = "string" | "number" | "integer" | "date" | "month" | "enum" | "boolean";

export type FieldDef = {
  /** Canonical field name used in the column map and row schema. */
  key: string;
  /** Human label shown in the column-mapper UI. */
  label: string;
  /** When true, the column-map step refuses to advance until the user
   *  has assigned a header to this field (or accepted the auto-match). */
  required: boolean;
  type: FieldType;
  /** When type === "enum", the allowed values (canonical form). */
  enum?: readonly string[];
  /** Hint shown under the field in the mapper UI. */
  description?: string;
};

export type ColumnMap = Record<string, string | null>;

export type RowError = {
  row: number; // 1-based, matches what the user sees in Excel
  column?: string;
  message: string;
};

export type ValidationResult<TInput> = {
  valid: TInput[];
  errors: RowError[];
};

export type CommitContext = {
  user: { id: string };
  company: { id: string };
};

export type CommitOutcome = {
  committed: number;
  errors: RowError[];
};

export type ImportConfig<TInput = unknown> = {
  /** Module identifier — matches the URL slug used in /imports/[module]/upload. */
  module: string;
  label: string;
  description: string;
  /** Canonical fields the user maps source columns onto. */
  fields: ReadonlyArray<FieldDef>;
  /** Aliases per canonical key — the auto-mapper accepts any of these
   *  (case-insensitive, trimmed) as a header for that field. */
  headerAliases: Record<string, ReadonlyArray<string>>;
  /** Row Zod schema — produces a typed input ready for `commit`. */
  rowSchema: z.ZodType<TInput>;
  /** Commits valid rows. Returns counts + any per-row errors that
   *  surfaced during DB writes (FK violations, race conditions). */
  commit: (ctx: CommitContext, rows: TInput[]) => Promise<CommitOutcome>;
  /** Name of the route to redirect to after a successful commit. */
  redirectAfterCommit: string;
  /** A small CSV template string the UI can offer as a download. */
  templateCsv: string;
};

export type ParsedFile = {
  headers: string[];
  /** Each row is parsed as an object keyed by the original header
   *  string. Rows past `MAX_ROWS` are dropped — the engine refuses
   *  files with more than the cap up front. */
  rows: Record<string, string>[];
};

export const MAX_IMPORT_ROWS = 5000;
