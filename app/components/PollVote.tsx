import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PollSnapshot } from "../../shared/types/poll.types";
import { PollStatus } from "../../shared/types/poll.types";
import { getVotedOptionId, getVoterToken } from "./voter-storage";

interface PollVoteProps {
  poll: PollSnapshot;
  onVote: (snapshot: PollSnapshot) => void;
}

export function PollVote({ poll, onVote }: PollVoteProps): React.ReactElement {
  const { t } = useTranslation(["common", "errors"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(getVotedOptionId(poll.id));
  }, [poll.id]);

  const isClosed = poll.status === PollStatus.Closed;
  const hasVoted = selectedId !== null;
  const votedLabel = poll.options.find((o) => o.id === selectedId)?.label;

  const handleVote = async (optionId: string): Promise<void> => {
    if (isClosed || hasVoted || voting) {
      return;
    }

    setVoting(true);
    setError(null);
    setSelectedId(optionId);

    try {
      const response = await fetch(`/api/v1/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId,
          voterToken: getVoterToken(),
        }),
      });

      if (!response.ok) {
        setSelectedId(getVotedOptionId(poll.id));
        setError(t("errors:voteFailed", { ns: "errors" }));
        return;
      }

      const snapshot = (await response.json()) as PollSnapshot;
      localStorage.setItem(`qp:voted:${poll.id}`, optionId);
      onVote(snapshot);
    } catch {
      setSelectedId(getVotedOptionId(poll.id));
      setError(t("errors:generic", { ns: "errors" }));
    } finally {
      setVoting(false);
    }
  };

  if (isClosed) {
    return (
      <p className="alert alert-info" role="status">
        {t("pollClosed")}
      </p>
    );
  }

  if (hasVoted && votedLabel) {
    return (
      <p className="alert alert-success" role="status">
        {t("youVoted", { option: votedLabel })}
      </p>
    );
  }

  return (
    <section aria-labelledby="vote-heading">
      <fieldset className="space-y-3 border-0 p-0">
        <legend id="vote-heading" className="text-lg font-semibold mb-3">
          {t("vote")}
        </legend>
        <div className="flex flex-col gap-2">
          {poll.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="btn btn-outline justify-start"
              onClick={() => void handleVote(option.id)}
              disabled={voting}
            >
              {voting && selectedId === option.id ? t("voting") : option.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="text-error text-sm mt-2" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
