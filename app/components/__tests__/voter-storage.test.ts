import { describe, expect, it, vi } from "vitest";
import { getVotedOptionId, getVoterToken } from "../voter-storage";

describe("voter-storage", () => {
  it("returns empty values when window is unavailable", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);

    expect(getVoterToken()).toBe("");
    expect(getVotedOptionId("poll-1")).toBeNull();

    vi.stubGlobal("window", originalWindow);
  });

  it("creates and reuses a voter token", () => {
    localStorage.clear();
    const first = getVoterToken();
    const second = getVoterToken();
    expect(first).toBe(second);
    expect(localStorage.getItem("qp:voter")).toBe(first);
    localStorage.clear();
  });

  it("reads a stored voted option id", () => {
    localStorage.setItem("qp:voted:poll-1", "option-1");
    expect(getVotedOptionId("poll-1")).toBe("option-1");
    localStorage.clear();
  });
});
