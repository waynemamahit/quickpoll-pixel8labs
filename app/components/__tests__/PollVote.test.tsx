import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import i18n from "../../i18n/config";
import { PollVote } from "../PollVote";

const poll: PollSnapshot = {
  id: "p1",
  question: "Q",
  options: [
    { id: "o1", label: "A", votes: 0 },
    { id: "o2", label: "B", votes: 0 },
  ],
  status: PollStatus.Open,
  totalVotes: 0,
  createdAt: 1,
  closedAt: null,
  expiresAt: 2,
};

describe("PollVote", () => {
  it("submits vote", async () => {
    localStorage.clear();
    const onVote = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...poll, totalVotes: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={poll} onVote={onVote} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "A" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await vi.waitFor(() => expect(onVote).toHaveBeenCalled());
  });
});
