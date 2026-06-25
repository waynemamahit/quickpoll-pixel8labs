import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import i18n from "../../i18n/config";
import { PollVote } from "../PollVote";

const closedPoll: PollSnapshot = {
  id: "p1",
  question: "Q",
  options: [{ id: "o1", label: "A", votes: 1 }],
  status: PollStatus.Closed,
  totalVotes: 1,
  createdAt: 1,
  closedAt: 2,
  expiresAt: 3,
};

describe("PollVote branches", () => {
  it("shows closed message", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={closedPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    expect(screen.getByText(/closed/i)).toBeInTheDocument();
  });

  it("shows already voted message", () => {
    localStorage.setItem("qp:voted:p1", "o1");
    const openPoll = {
      ...closedPoll,
      status: PollStatus.Open,
    };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    expect(screen.getByText(/you voted/i)).toBeInTheDocument();
    localStorage.clear();
  });

  it("shows vote failure response", async () => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const openPoll = { ...closedPoll, status: PollStatus.Open };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("handles network error on vote", async () => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const openPoll = { ...closedPoll, status: PollStatus.Open };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("ignores rapid double vote clicks", async () => {
    localStorage.clear();
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const openPoll = { ...closedPoll, status: PollStatus.Open };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    const button = screen.getByRole("button", { name: "A" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing voter token", async () => {
    localStorage.setItem("qp:voter", "existing-voter-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...closedPoll, status: PollStatus.Open }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const openPoll = { ...closedPoll, status: PollStatus.Open };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/polls/p1/vote",
        expect.objectContaining({
          body: JSON.stringify({
            optionId: "o1",
            voterToken: "existing-voter-token",
          }),
        }),
      ),
    );
    localStorage.clear();
  });

  it("ignores vote when stored option id is unknown", () => {
    localStorage.setItem("qp:voted:p1", "missing-option");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const openPoll = { ...closedPoll, status: PollStatus.Open };
    render(
      <I18nextProvider i18n={i18n}>
        <PollVote poll={openPoll} onVote={vi.fn()} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(fetchMock).not.toHaveBeenCalled();
    localStorage.clear();
  });
});
