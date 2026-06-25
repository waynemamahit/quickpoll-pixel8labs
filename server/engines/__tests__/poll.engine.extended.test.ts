import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import type { ILoggerService } from "../../types/logger.types";
import type { IPollService } from "../../types/poll.types";
import { PollEngine } from "../poll.engine";

const snapshot: PollSnapshot = {
  id: "poll-1",
  question: "Q?",
  options: [],
  status: PollStatus.Open,
  totalVotes: 0,
  createdAt: 1,
  closedAt: null,
  expiresAt: 2,
};

describe("PollEngine extended", () => {
  let pollService: IPollService;
  let engine: PollEngine;

  beforeEach(() => {
    pollService = {
      init: vi.fn(),
      getSnapshot: vi.fn().mockResolvedValue(snapshot),
      vote: vi.fn(),
      close: vi
        .fn()
        .mockResolvedValue({ ...snapshot, status: PollStatus.Closed }),
      stream: vi.fn().mockResolvedValue(new Response("ok")),
    };
    const logger: ILoggerService = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      setCorrelationId: vi.fn(),
      getCorrelationId: vi.fn().mockReturnValue("id"),
    };
    engine = new PollEngine({ pollService, loggerService: logger });
  });

  it("closes poll", async () => {
    const result = await engine.close("poll-1", "token");
    expect(result.status).toBe(PollStatus.Closed);
  });

  it("streams poll", async () => {
    const res = await engine.stream("poll-1", new Request("http://x/stream"));
    expect(res).toBeTruthy();
  });
});
