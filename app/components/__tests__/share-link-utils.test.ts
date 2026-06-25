import { describe, expect, it, vi } from "vitest";
import { buildShareUrl, getCreatorTokenFromHash } from "../share-link-utils";

describe("share-link-utils", () => {
  it("reads creator token from hash", () => {
    expect(getCreatorTokenFromHash("#c=abc-123")).toBe("abc-123");
  });

  it("returns null for missing or invalid hash", () => {
    expect(getCreatorTokenFromHash("")).toBeNull();
    expect(getCreatorTokenFromHash("#c=")).toBeNull();
    expect(getCreatorTokenFromHash("#other")).toBeNull();
  });

  it("builds an absolute share URL in the browser", () => {
    expect(buildShareUrl("poll-1")).toMatch(/\/p\/poll-1$/);
  });

  it("builds a relative share URL during SSR", () => {
    const originalWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    expect(buildShareUrl("poll-1")).toBe("/p/poll-1");
    vi.stubGlobal("window", originalWindow);
  });
});
