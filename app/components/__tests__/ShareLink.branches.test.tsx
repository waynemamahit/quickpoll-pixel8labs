import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n/config";
import { ShareLink } from "../ShareLink";

describe("ShareLink branches", () => {
  it("ignores close without creator token", () => {
    window.location.hash = "";
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    expect(screen.queryByRole("button", { name: /close poll/i })).toBeNull();
  });

  it("shows copy failure", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows close network error", async () => {
    window.location.hash = "#c=tok";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /close poll/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("shows close failure", async () => {
    window.location.hash = "#c=tok";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /close poll/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("shows close success", async () => {
    window.location.hash = "#c=tok";
    const onClosed = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "abc",
            status: "closed",
            question: "Q",
            options: [],
            totalVotes: 0,
            createdAt: 1,
            closedAt: 2,
            expiresAt: 3,
          }),
      }),
    );
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" onClosed={onClosed} />
      </I18nextProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /close poll/i }));
    await waitFor(() => expect(onClosed).toHaveBeenCalled());
  });

  it("shows closing state while request is in flight", async () => {
    window.location.hash = "#c=tok";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      id: "abc",
                      status: "closed",
                      question: "Q",
                      options: [],
                      totalVotes: 0,
                      createdAt: 1,
                      closedAt: 2,
                      expiresAt: 3,
                    }),
                }),
              50,
            );
          }),
      ),
    );
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /close poll/i }));
    expect(screen.getByRole("button", { name: /closing/i })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /close poll/i })).toBeEnabled(),
    );
  });

  it("resets copied state after timeout", async () => {
    vi.useFakeTimers();
    try {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
      render(
        <I18nextProvider i18n={i18n}>
          <ShareLink pollId="abc" />
        </I18nextProvider>,
      );
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
      });
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText(/Copy link/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes poll without onClosed callback", async () => {
    window.location.hash = "#c=tok";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "abc",
          status: "closed",
          question: "Q",
          options: [],
          totalVotes: 0,
          createdAt: 1,
          closedAt: 2,
          expiresAt: 3,
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <I18nextProvider i18n={i18n}>
        <ShareLink pollId="abc" />
      </I18nextProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /close poll/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
