import { describe, expect, it, vi } from "vitest";
import { resolveLocale, t } from "../../i18n/config";

describe("server i18n", () => {
  it("resolves locale from header", () => {
    expect(resolveLocale("id-ID,id;q=0.9")).toBe("id");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("translates keys", async () => {
    const { initServerI18n } = await import("../../i18n/config");
    await initServerI18n();
    expect(t("poll.notFound", "en")).toContain("not found");
  });
});

describe("LoggerService logging", () => {
  it("logs info without throwing", async () => {
    const { LoggerService } = await import("../logger.service");
    const logger = new LoggerService();
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello", { safe: "data" });
    logger.warn("warn");
    logger.debug("debug");
    logger.error("err", new Error("x"));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
