import { describe, expect, it } from "vitest";
import { mapErrorResponse } from "../error-handler";

describe("mapErrorResponse", () => {
  it("maps domain errors with status and code", () => {
    const result = mapErrorResponse(
      { status: 409, code: "poll.closed", message: "Closed" },
      "corr-1",
    );
    expect(result.status).toBe(409);
    expect(result.body).toEqual({
      error: "Closed",
      correlationId: "corr-1",
      code: "poll.closed",
    });
  });

  it("maps generic errors to 500", () => {
    const result = mapErrorResponse(new Error("boom"), "corr-2");
    expect(result.status).toBe(500);
    expect(result.body.error).toBe("Internal Server Error");
    expect(result.body.correlationId).toBe("corr-2");
  });
});
