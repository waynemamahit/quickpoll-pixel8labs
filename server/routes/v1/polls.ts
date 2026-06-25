import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono/tiny";
import { rateLimiter } from "hono-rate-limiter";
import {
  createPollSchema,
  voteSchema,
} from "../../../shared/schemas/poll.schema";
import { getEngine, getLogger } from "../../containers";
import { resolveLocale } from "../../engines/poll.engine";

const polls = new Hono<{ Bindings: Env }>();

polls.post(
  "/",
  rateLimiter<{ Bindings: Env }>({
    binding: (c) => c.env.SHORT_RATE_LIMITER,
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "local",
  }),
  zValidator("json", createPollSchema),
  async (c) => {
    const locale = resolveLocale(c.req.header("accept-language"));
    const input = c.req.valid("json");
    const result = await getEngine(c).create(input, locale);
    getLogger(c).info("Poll created", { pollId: result.id });
    return c.json(result, 201);
  },
);

polls.get("/:id", async (c) => {
  const locale = resolveLocale(c.req.header("accept-language"));
  const poll = await getEngine(c).getSnapshot(c.req.param("id"), locale);
  return c.json(poll);
});

polls.post(
  "/:id/vote",
  rateLimiter<{ Bindings: Env }>({
    binding: (c) => c.env.SHORT_RATE_LIMITER,
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "local",
  }),
  zValidator("json", voteSchema),
  async (c) => {
    const locale = resolveLocale(c.req.header("accept-language"));
    const input = c.req.valid("json");
    const poll = await getEngine(c).vote(c.req.param("id"), input, locale);
    return c.json(poll);
  },
);

polls.post("/:id/close", async (c) => {
  const locale = resolveLocale(c.req.header("accept-language"));
  const creatorToken = c.req.header("x-creator-token");
  if (!creatorToken) {
    return c.json(
      {
        error: "Missing creator token",
        correlationId: getLogger(c).getCorrelationId(),
      },
      403,
    );
  }
  const poll = await getEngine(c).close(
    c.req.param("id"),
    creatorToken,
    locale,
  );
  return c.json(poll);
});

polls.get("/:id/stream", async (c) => {
  if (c.req.header("Upgrade")) {
    return c.text("SSE does not use WebSocket upgrade", 400);
  }
  return getEngine(c).stream(c.req.param("id"), c.req.raw);
});

export default polls;
