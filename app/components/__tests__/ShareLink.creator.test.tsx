import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../i18n/config";
import { ShareLink } from "../ShareLink";

describe("ShareLink creator", () => {
  it("closes poll when creator token in hash", async () => {
    window.location.hash = "#c=creator-token";
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
