import { env, runDurableObjectAlarm } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Poll DO", () => {
  const pollId = "test-poll-1";
  const creatorToken = "creator-token-1";
  let optionId = "";

  it("initializes and returns zero-state snapshot", async () => {
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId));
    await stub.init({
      id: pollId,
      question: "Favorite color?",
      options: [{ label: "Red" }, { label: "Blue" }],
      creatorToken,
    });

    const snapshot = await stub.getSnapshot();
    expect(snapshot).toBeTruthy();
    expect(snapshot?.totalVotes).toBe(0);
    expect(snapshot).not.toHaveProperty("creatorToken");
    expect(snapshot).not.toHaveProperty("voterTokens");
    optionId = snapshot?.options[0]?.id ?? "";
  });

  it("increments vote count", async () => {
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId));
    const result = await stub.vote({ optionId, voterToken: "voter-1" });
    expect(result.totalVotes).toBe(1);
    expect(result.options[0]?.votes).toBe(1);
  });

  it("rejects duplicate vote with 409", async () => {
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId));
    try {
      await stub.vote({ optionId, voterToken: "voter-1" });
      expect.unreachable("expected duplicate vote error");
    } catch (error) {
      expect(error).toMatchObject({ code: "poll.duplicateVote", status: 409 });
    }
  });

  it("closes poll for creator", async () => {
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId));
    const closed = await stub.close({ creatorToken });
    expect(closed.status).toBe("closed");
  });

  it("rejects vote on closed poll", async () => {
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId));
    try {
      await stub.vote({ optionId, voterToken: "voter-2" });
      expect.unreachable("expected closed poll error");
    } catch (error) {
      expect(error).toMatchObject({ code: "poll.closed", status: 409 });
    }
  });

  it("rejects close with wrong token", async () => {
    const pollId2 = "test-poll-2";
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId2));
    await stub.init({
      id: pollId2,
      question: "Q2",
      options: [{ label: "A" }, { label: "B" }],
      creatorToken: "real-token",
    });
    try {
      await stub.close({ creatorToken: "wrong" });
      expect.unreachable("expected forbidden error");
    } catch (error) {
      expect(error).toMatchObject({
        code: "poll.forbidden",
        status: 403,
      });
    }
  });

  it("deletes state on alarm", async () => {
    const pollId3 = "test-poll-expiry";
    const stub = env.DO_POLL.get(env.DO_POLL.idFromName(pollId3));
    await stub.init({
      id: pollId3,
      question: "Expire me",
      options: [{ label: "A" }, { label: "B" }],
      creatorToken: "tok",
    });
    await runDurableObjectAlarm(stub);
    const snapshot = await stub.getSnapshot();
    expect(snapshot).toBeNull();
  });
});
