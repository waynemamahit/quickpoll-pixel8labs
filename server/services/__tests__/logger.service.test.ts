import { describe, expect, it } from "vitest";
import { LoggerService, sanitizeLogMeta } from "../logger.service";

describe("LoggerService", () => {
  it("propagates correlation id", () => {
    const logger = new LoggerService();
    const id = "test-correlation-id";
    logger.setCorrelationId(id);
    expect(logger.getCorrelationId()).toBe(id);
  });

  it("sanitizes sensitive fields in meta", () => {
    const sanitized = sanitizeLogMeta({
      password: "secret123",
      token: "abc",
      apiKey: "key",
      safe: "visible",
      nested: { secret: "hidden", name: "ok" },
    });

    expect(sanitized).toEqual({
      password: "[REDACTED]",
      token: "[REDACTED]",
      apiKey: "[REDACTED]",
      safe: "visible",
      nested: { secret: "[REDACTED]", name: "ok" },
    });
  });

  it("sanitizes arrays in meta", () => {
    const sanitized = sanitizeLogMeta({
      items: [{ token: "secret", ok: true }],
    });
    expect(sanitized).toEqual({ items: [{ token: "[REDACTED]", ok: true }] });
  });

  it("passes through null values", () => {
    expect(sanitizeLogMeta({ empty: null })).toEqual({ empty: null });
  });
});
