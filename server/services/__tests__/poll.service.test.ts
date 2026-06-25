import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import { PollDomainError } from "../../errors/poll-domain.error";
import { PollService } from "../poll.service";

const snapshot: PollSnapshot = {
  id: "poll-1",
  question: "Q?",
  options: [{ id: "o1", label: "A", votes: 0 }],
  status: PollStatus.Open,
  totalVotes: 0,
  createdAt: 1,
  closedAt: null,
  expiresAt: 2,
};

function createMockStub() {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
    vote: vi.fn().mockResolvedValue(snapshot),
    close: vi
      .fn()
      .mockResolvedValue({ ...snapshot, status: PollStatus.Closed }),
    fetch: vi.fn().mockResolvedValue(new Response("stream")),
  };
}

describe("PollService", () => {
  let stub: ReturnType<typeof createMockStub>;
  let service: PollService;

  beforeEach(() => {
    stub = createMockStub();
    const get = vi.fn().mockReturnValue(stub);
    const idFromName = vi.fn().mockReturnValue({ toString: () => "id" });
    const env = {
      DO_POLL: { get, idFromName },
    } as unknown as Env;
    service = new PollService({ env });
  });

  it("initializes poll via stub", async () => {
    await service.init("poll-1", {
      question: "Q",
      options: [{ label: "A" }],
      creatorToken: "tok",
    });
    expect(stub.init).toHaveBeenCalled();
  });

  it("returns snapshot", async () => {
    const result = await service.getSnapshot("poll-1");
    expect(result).toEqual(snapshot);
  });

  it("maps domain errors from vote", async () => {
    stub.vote.mockRejectedValue(new PollDomainError(409, "poll.closed"));
    await expect(
      service.vote("poll-1", { optionId: "o1", voterToken: "v1" }),
    ).rejects.toBeInstanceOf(PollDomainError);
  });

  it("forwards stream requests", async () => {
    const req = new Request("http://localhost/stream");
    await service.stream("poll-1", req);
    expect(stub.fetch).toHaveBeenCalled();
  });

  it("maps domain errors from close", async () => {
    stub.close.mockRejectedValue(new PollDomainError(403, "poll.forbidden"));
    await expect(service.close("poll-1", "bad")).rejects.toBeInstanceOf(
      PollDomainError,
    );
  });

  it("maps Error instances on vote", async () => {
    stub.vote.mockRejectedValue(new Error("rpc fail"));
    await expect(
      service.vote("poll-1", { optionId: "o1", voterToken: "v1" }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("maps primitive errors on close", async () => {
    stub.close.mockRejectedValue(null);
    await expect(service.close("poll-1", "tok")).rejects.toMatchObject({
      status: 500,
    });
  });
});
