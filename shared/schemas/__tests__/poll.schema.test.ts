import { describe, expect, it } from "vitest";
import { createPollSchema, voteSchema } from "../poll.schema";

describe("createPollSchema", () => {
  it("accepts valid input", () => {
    const result = createPollSchema.safeParse({
      question: "Lunch?",
      options: ["Pizza", "Salad"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(2);
    }
  });

  it("trims and drops blank options", () => {
    const result = createPollSchema.safeParse({
      question: "Pick one",
      options: [" A ", "", "  ", "B"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options.map((o) => o.label)).toEqual(["A", "B"]);
    }
  });

  it("rejects too few options", () => {
    const result = createPollSchema.safeParse({
      question: "Q",
      options: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate labels", () => {
    const result = createPollSchema.safeParse({
      question: "Q",
      options: ["Same", "same"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty question", () => {
    const result = createPollSchema.safeParse({
      question: "   ",
      options: ["A", "B"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects option label too long", () => {
    const result = createPollSchema.safeParse({
      question: "Q",
      options: ["A", "B".repeat(100)],
    });
    expect(result.success).toBe(false);
  });
});

describe("voteSchema", () => {
  it("requires optionId and voterToken", () => {
    expect(voteSchema.safeParse({}).success).toBe(false);
    expect(
      voteSchema.safeParse({ optionId: "1", voterToken: "v" }).success,
    ).toBe(true);
  });
});
