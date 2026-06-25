import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import type { PollSnapshot } from "../../../shared/types/poll.types";
import { PollStatus } from "../../../shared/types/poll.types";
import i18n from "../../i18n/config";
import { PollResults } from "../PollResults";

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

describe("PollResults", () => {
  it("renders zero state without divide-by-zero", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PollResults poll={poll} />
      </I18nextProvider>,
    );
    expect(screen.getByText(/no votes yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText("A: 0%")).toBeInTheDocument();
  });

  it("renders percentages when votes exist", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PollResults
          poll={{
            ...poll,
            totalVotes: 2,
            options: [
              { id: "o1", label: "A", votes: 1 },
              { id: "o2", label: "B", votes: 1 },
            ],
          }}
        />
      </I18nextProvider>,
    );
    expect(screen.getByLabelText("A: 50%")).toBeInTheDocument();
  });
});
