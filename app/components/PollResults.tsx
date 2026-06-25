import { useTranslation } from "react-i18next";
import type { PollSnapshot } from "../../shared/types/poll.types";

interface PollResultsProps {
  poll: PollSnapshot;
}

export function PollResults({ poll }: PollResultsProps): React.ReactElement {
  const { t } = useTranslation();

  const total = poll.totalVotes;
  const isEmpty = total === 0;

  return (
    <section aria-labelledby="results-heading" aria-live="polite">
      <h2 id="results-heading" className="text-lg font-semibold mb-2">
        {t("results")}
      </h2>
      <p className="text-sm text-base-content/70 mb-4">
        {isEmpty ? t("noVotesYet") : t("totalVotes", { count: total })}
      </p>
      <ul className="space-y-3">
        {poll.options.map((option) => {
          const percent =
            total === 0 ? 0 : Math.round((option.votes / total) * 100);
          return (
            <li key={option.id}>
              <div className="flex justify-between text-sm mb-1">
                <span>{option.label}</span>
                <span>
                  {option.votes} ({t("percent", { value: percent })})
                </span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={percent}
                max={100}
                aria-label={`${option.label}: ${percent}%`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
