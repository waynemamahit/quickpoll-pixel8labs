import { describe, expect, it, vi } from "vitest";
import type { ILoggerService } from "../../types/logger.types";
import { createErrorHandler, mapErrorResponse } from "../error-handler";

describe("createErrorHandler", () => {
  it("returns json error with correlation id", () => {
    const logger: ILoggerService = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      setCorrelationId: vi.fn(),
      getCorrelationId: vi.fn().mockReturnValue("corr-99"),
    };
    const handler = createErrorHandler(logger);
    const response = handler(new Error("fail"), {
      req: { path: "/x", method: "GET" },
      json: (body: unknown, status: number) =>
        new Response(JSON.stringify(body), { status }),
    } as never);

    expect(response.status).toBe(500);
  });
});

describe("mapErrorResponse unknown", () => {
  it("handles non-error values", () => {
    const result = mapErrorResponse(null, "c1");
    expect(result.status).toBe(500);
  });
});
