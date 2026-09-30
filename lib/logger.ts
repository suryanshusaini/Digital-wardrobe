/**
 * Structured Logger with PII sanitization, request correlation, and optional Sentry hook.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  requestId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

// ── PII Sanitization ────────────────────────────────────────────────────────
const PII_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
]);

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : "***";
  return `${maskedLocal}@${domain}`;
}

export function sanitizeLogData(data: unknown): unknown {
  if (typeof data === "string") {
    // Mask email occurrences in strings
    return data.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (_, local, domain) => {
      const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : "***";
      return `${maskedLocal}@${domain}`;
    });
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (data && typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (PII_KEYS.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else if (key.toLowerCase().includes("email") && typeof value === "string") {
        sanitized[key] = maskEmail(value);
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}

// ── Structured Logger Class ──────────────────────────────────────────────────
class Logger {
  private formatLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedMeta = sanitizeLogData(meta) as Record<string, unknown>;

    const logEntry: LogPayload = {
      timestamp,
      level,
      message,
      ...sanitizedMeta,
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.formatLog("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", message, meta));
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorDetails =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message }
        : { rawError: String(error) };

    const mergedMeta = { ...errorDetails, ...meta };
    console.error(this.formatLog("error", message, mergedMeta));

    // Optional Sentry telemetry hook
    if (process.env.ENABLE_SENTRY === "true") {
      this.captureSentry(message, error, mergedMeta);
    }
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, meta));
    }
  }

  /**
   * Sentry integration hook point.
   * Can be configured by initializing @sentry/nextjs when ENABLE_SENTRY=true.
   */
  private captureSentry(message: string, error: unknown, meta: Record<string, unknown>) {
    try {
      // Hook point for Sentry without adding hard dependency
      if (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__SENTRY__) {
        // If Sentry SDK is present in global runtime, delegate exception
        const sentry = (globalThis as Record<string, unknown>).__SENTRY__ as {
          captureException?: (err: unknown, extra: unknown) => void;
        };
        sentry.captureException?.(error, { extra: meta });
      }
    } catch {
      // Fail silently to avoid logger crash
    }
  }
}

export const logger = new Logger();

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}
