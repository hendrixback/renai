import "server-only";

import type {
  ColumnMap,
  ImportConfig,
  ParsedFile,
  RowError,
  ValidationResult,
} from "./types";

/**
 * Generic import engine.
 *
 * Given a parsed file (headers + raw rows) and an `ImportConfig`,
 * produces:
 *  - `autoMap()`   — best-guess column mapping using header aliases.
 *  - `validate()`  — per-row Zod validation; returns the typed valid
 *                    rows + a sparse error report.
 *
 * The actual file parsing lives in `parser.ts`; the actual DB writes
 * live in each config's `commit` function. This module owns the
 * mapping + validation glue between them.
 */

/**
 * Auto-map source headers to canonical fields using the config's
 * header aliases. Case-insensitive, trimmed. A field that has no
 * matching header maps to `null` and the user has to pick one in the
 * mapper UI.
 */
export function autoMap(
  headers: string[],
  config: ImportConfig,
): ColumnMap {
  const lowered = headers.map((h) => h.toLowerCase().trim());
  const map: ColumnMap = {};
  for (const field of config.fields) {
    const aliases = (config.headerAliases[field.key] ?? [field.key, field.label]).map(
      (a) => a.toLowerCase().trim(),
    );
    const matchIdx = lowered.findIndex((h) => aliases.includes(h));
    map[field.key] = matchIdx >= 0 ? headers[matchIdx] : null;
  }
  return map;
}

/**
 * Validate every row in the parsed file against the config's row
 * schema, after rewriting source headers to canonical field keys via
 * the user-confirmed column map.
 *
 * Rows are 1-indexed in errors so the message lines up with what the
 * user sees in Excel (header row = row 1, first data row = row 2).
 */
export function validate<T>(
  parsed: ParsedFile,
  config: ImportConfig<T>,
  columnMap: ColumnMap,
): ValidationResult<T> {
  const errors: RowError[] = [];
  const valid: T[] = [];

  // Pre-check required fields
  for (const field of config.fields) {
    if (field.required && !columnMap[field.key]) {
      errors.push({
        row: 0,
        column: field.label,
        message: `Required field "${field.label}" is not mapped to any column.`,
      });
    }
  }
  if (errors.length > 0) {
    return { valid, errors };
  }

  parsed.rows.forEach((sourceRow, idx) => {
    const rowNumber = idx + 2; // header is row 1
    const canonical: Record<string, unknown> = {};
    for (const field of config.fields) {
      const sourceCol = columnMap[field.key];
      if (!sourceCol) continue;
      const raw = sourceRow[sourceCol];
      canonical[field.key] = raw == null ? "" : raw;
    }

    const parseResult = config.rowSchema.safeParse(canonical);
    if (parseResult.success) {
      valid.push(parseResult.data);
    } else {
      for (const issue of parseResult.error.issues) {
        const fieldKey = String(issue.path[0] ?? "");
        const field = config.fields.find((f) => f.key === fieldKey);
        errors.push({
          row: rowNumber,
          column: field?.label ?? fieldKey,
          message: issue.message,
        });
      }
    }
  });

  return { valid, errors };
}
