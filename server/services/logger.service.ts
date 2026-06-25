import type { ILoggerService } from "../types/logger.types";

const SENSITIVE_PATTERN = /password|token|secret|key|auth|credit|ssn|bearer/i;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_PATTERN.test(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitizeValue(val);
      }
    }
    return result;
  }

  return value;
}

export class LoggerService implements ILoggerService {
  private correlationId: string = crypto.randomUUID();

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log("error", message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  private log(
    level: string,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const payload = {
      level,
      message,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      ...(meta ? { meta: sanitizeValue(meta) } : {}),
    };
    console.log(JSON.stringify(payload));
  }
}

export function sanitizeLogMeta(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeValue(meta) as Record<string, unknown>;
}
