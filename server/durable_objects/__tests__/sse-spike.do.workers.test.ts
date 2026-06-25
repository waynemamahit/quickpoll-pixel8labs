import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("SseSpike DO", () => {
  it("streams via fetch and broadcasts from RPC", async () => {
    const id = env.DO_SSE_SPIKE.idFromName("spike-test");
    const stub = env.DO_SSE_SPIKE.get(id);

    const streamResponse = await stub.fetch("http://do/stream");
    expect(streamResponse.headers.get("Content-Type")).toBe(
      "text/event-stream",
    );

    const reader = streamResponse.body?.getReader();
    expect(reader).toBeTruthy();
    const first = await reader?.read();
    const firstText = new TextDecoder().decode(first?.value);
    expect(firstText).toContain("connected");

    const sent = await stub.broadcast("hello");
    expect(sent).toBeGreaterThanOrEqual(1);

    const second = await reader?.read();
    const secondText = new TextDecoder().decode(second?.value);
    expect(secondText).toContain("hello");
    await reader?.cancel();
  });
});
