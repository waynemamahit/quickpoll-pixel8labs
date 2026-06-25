import { describe, expect, it } from "vitest";
import { mapErrorResponse } from "../error-handler";

describe("mapErrorResponse domain without message", () => {
  it("uses code when message missing", () => {
    const result = mapErrorResponse({ status: 400, code: "poll.bad" }, "c");
    expect(result.body.error).toBe("poll.bad");
  });
});
