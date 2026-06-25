import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { Hono } from "hono/tiny";
import { rateLimiter } from "hono-rate-limiter";
import {
  createContext,
  createRequestHandler,
  RouterContextProvider,
} from "react-router";
import {
  containerMiddleware,
  requestContainerContext,
  setupRequestContainer,
} from "./containers";
import { PollDomainError } from "./errors/poll-domain.error";
import { createErrorHandler } from "./middleware/error-handler";
import apiV1 from "./routes/v1";
import type { ILoggerService } from "./types/logger.types";

const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw || raw.startsWith("${")) {
    return ["http://localhost:5173"];
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  return allowed.includes(origin) || allowed.includes("*");
}

const app = new Hono<{ Bindings: Env }>();

app.use(secureHeaders());

app.use(async (c, next) => {
  const allowed = parseAllowedOrigins(c.env.CORS_ALLOWED_ORIGINS);
  const csrfMiddleware = csrf({
    origin: (origin) => isAllowedOrigin(origin, allowed),
  });
  return csrfMiddleware(c, next);
});

app.use("/api/*", async (c, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    const allowed = parseAllowedOrigins(c.env.CORS_ALLOWED_ORIGINS);
    if (origin && !isAllowedOrigin(origin, allowed)) {
      return c.json(
        { error: "Forbidden origin", correlationId: crypto.randomUUID() },
        403,
      );
    }
  }
  await next();
});

app.use(
  rateLimiter<{ Bindings: Env }>({
    binding: (c) => c.env.LONG_RATE_LIMITER,
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "local",
  }),
);

app.use(logger());

app.use("/api/*", async (c, next) => {
  const allowed = parseAllowedOrigins(c.env.CORS_ALLOWED_ORIGINS);
  const corsMiddleware = cors({
    origin: (origin) => (isAllowedOrigin(origin, allowed) ? origin : ""),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-Id",
      "X-Creator-Token",
    ],
  });
  await corsMiddleware(c, next);
});

app.use("/api/*", containerMiddleware());

app.onError((err, c) => {
  if (err instanceof PollDomainError) {
    let correlationId: string = crypto.randomUUID();
    try {
      const loggerService = c
        .get("container")
        ?.resolve<ILoggerService>("loggerService");
      correlationId = loggerService?.getCorrelationId() ?? correlationId;
    } catch {
      // container may be unavailable
    }
    return c.json(
      {
        error: err.message,
        correlationId,
        code: err.code,
      },
      err.status as 400 | 403 | 404 | 409,
    );
  }
  try {
    const loggerService = c
      .get("container")
      ?.resolve<ILoggerService>("loggerService");
    if (loggerService) {
      return createErrorHandler(loggerService)(err, c);
    }
  } catch {
    // fall through
  }
  return c.json(
    { error: "Internal Server Error", correlationId: crypto.randomUUID() },
    500,
  );
});

app.route("/api/v1", apiV1);

app.all("*", async (c) => {
  const routerContext = new RouterContextProvider();
  const { scope } = setupRequestContainer(
    c.env,
    c.req.header("x-correlation-id") ?? undefined,
  );
  routerContext.set(cloudflareContext, {
    env: c.env,
    ctx: c.executionCtx as ExecutionContext,
  });
  routerContext.set(requestContainerContext, scope);
  return await requestHandler(c.req.raw, routerContext);
});

const handler: ExportedHandler<Env> = {
  fetch: app.fetch,
};

export default handler satisfies ExportedHandler<Env>;

export { Poll } from "./durable_objects/poll.do";
export { SseSpike } from "./durable_objects/sse-spike.do";
