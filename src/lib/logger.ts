import "server-only";

/**
 * Structured logger.
 *
 * Dev: pretty console output for readability.
 * Prod: single-line JSON per event, suitable for ingestion by Axiom / Datadog /
 * any log aggregator that parses JSON.
 *
 * Use this instead of `console.log` — console is banned in committed code
 * (see `Contribution_Standards.md` §1).
 *
 * Future: swap internals for pino when we need features like child loggers,
 * transports, or sampling. The public API stays stable.
 */

export type LogContext = Record<string, unknown>;

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // grey
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: err };
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const entry = {
      level,
      time: new Date().toISOString(),
      message,
      ...context,
    };
    // Intentionally using console here — this is the single sanctioned entry
    // point for log output. Everywhere else in the codebase must use `logger`.
    (level === "error" ? console.error : console.log)(JSON.stringify(entry));
    return;
  }

  const color = LEVEL_COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
  console.log(prefix, message, context ? context : "");
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit("warn", message, context);
  },
  error(message: string, err?: unknown, context?: LogContext): void {
    emit("error", message, {
      ...(err !== undefined ? { err: serializeError(err) } : {}),
      ...context,
    });
  },
};
