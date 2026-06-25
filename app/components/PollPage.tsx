import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PollSnapshot } from "../../shared/types/poll.types";
import { usePollStream } from "../hooks/use-poll-stream";
import { PollResults } from "./PollResults";
import { PollVote } from "./PollVote";
import { ShareLink } from "./ShareLink";

interface PollPageProps {
  initialPoll: PollSnapshot;
}

export function PollPage({ initialPoll }: PollPageProps): React.ReactElement {
  const [poll, setPoll] = useState(initialPoll);
  const livePoll = usePollStream(initialPoll.id, poll, () => {
    // fallback active
  });

  const displayPoll = livePoll.id ? livePoll : poll;

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{displayPoll.question}</h1>
      </header>
      <PollVote poll={displayPoll} onVote={setPoll} />
      <PollResults poll={displayPoll} />
      <ShareLink pollId={displayPoll.id} onClosed={setPoll} />
    </article>
  );
}

export function PollNotFound(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <section role="alert">
      <h1 className="text-2xl font-bold">{t("pollNotFound")}</h1>
    </section>
  );
}
