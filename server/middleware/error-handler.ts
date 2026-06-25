import type { Context } from "hono";
import type { ILoggerService } from "../types/logger.types";

export interface ApiErrorBody {
  error: string;
  correlationId: string;
  code?: string;
}

export function mapErrorResponse(
  err: unknown,
  correlationId: string,
): { body: ApiErrorBody; status: number } {
  if (err && typeof err === "object" && "status" in err && "code" in err) {
    const domainErr = err as { status: number; code: string; message?: string };
    return {
      status: domainErr.status,
      body: {
        error: domainErr.message ?? domainErr.code,
        correlationId,
        code: domainErr.code,
      },
    };
  }

  if (err instanceof Error) {
    return {
      status: 500,
      body: {
        error: "Internal Server Error",
        correlationId,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "Internal Server Error",
      correlationId,
    },
  };
}

export function createErrorHandler(logger: ILoggerService) {
  return (err: Error, c: Context): Response => {
    const correlationId = logger.getCorrelationId();
    logger.error("Unhandled error", err, {
      path: c.req.path,
      method: c.req.method,
    });

    const { body, status } = mapErrorResponse(err, correlationId);
    return c.json(body, status as 400 | 403 | 404 | 409 | 500);
  };
}
