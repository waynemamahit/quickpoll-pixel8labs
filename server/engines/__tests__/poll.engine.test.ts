import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import { PollDomainError } from "../../errors/poll-domain.error";
import type { ILoggerService } from "../../types/logger.types";
import type { IPollService } from "../../types/poll.types";
import { PollEngine } from "../poll.engine";

const snapshot: PollSnapshot = {
  id: "poll-1",
  question: "Q?",
  options: [
    { id: "o1", label: "A", votes: 0 },
    { id: "o2", label: "B", votes: 0 },
  ],
  status: PollStatus.Open,
  totalVotes: 0,
  createdAt: Date.now(),
  closedAt: null,
  expiresAt: Date.now() + 86400000,
};

describe("PollEngine", () => {
  let pollService: IPollService;
  let logger: ILoggerService;
  let engine: PollEngine;

  beforeEach(() => {
    pollService = {
      init: vi.fn().mockResolvedValue(undefined),
      getSnapshot: vi.fn().mockResolvedValue(snapshot),
      vote: vi.fn().mockResolvedValue(snapshot),
      close: vi
        .fn()
        .mockResolvedValue({ ...snapshot, status: PollStatus.Closed }),
      stream: vi.fn(),
    };
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      setCorrelationId: vi.fn(),
      getCorrelationId: vi.fn().mockReturnValue("cid"),
    };
    engine = new PollEngine({ pollService, loggerService: logger });
  });

  it("creates poll with id and creator token", async () => {
    const result = await engine.create({
      question: "Q?",
      options: [{ label: "A" }, { label: "B" }],
    });
    expect(result.id).toBeTruthy();
    expect(result.creatorToken).toBeTruthy();
    expect(result.poll).toEqual(snapshot);
  });

  it("throws when poll not found", async () => {
    vi.mocked(pollService.getSnapshot).mockResolvedValue(null);
    await expect(engine.getSnapshot("missing")).rejects.toBeInstanceOf(
      PollDomainError,
    );
  });

  it("maps vote domain errors to translated messages", async () => {
    vi.mocked(pollService.vote).mockRejectedValue(
      new PollDomainError(409, "poll.duplicateVote"),
    );
    await expect(
      engine.vote("poll-1", { optionId: "o1", voterToken: "v" }),
    ).rejects.toMatchObject({ status: 409, code: "poll.duplicateVote" });
  });

  it("returns snapshot from getSnapshot", async () => {
    const poll = await engine.getSnapshot("poll-1");
    expect(poll.id).toBe("poll-1");
  });

  it("throws when create returns no snapshot", async () => {
    vi.mocked(pollService.getSnapshot).mockResolvedValue(null);
    await expect(
      engine.create({
        question: "Q?",
        options: [{ label: "A" }, { label: "B" }],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("maps unknown close errors", async () => {
    vi.mocked(pollService.close).mockRejectedValue(new Error("network"));
    await expect(engine.close("poll-1", "tok")).rejects.toMatchObject({
      status: 500,
    });
  });
});
