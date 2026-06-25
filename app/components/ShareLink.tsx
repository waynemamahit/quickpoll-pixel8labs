import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PollSnapshot } from "../../shared/types/poll.types";
import { buildShareUrl, getCreatorTokenFromHash } from "./share-link-utils";

interface ShareLinkProps {
  pollId: string;
  onClosed?: (snapshot: PollSnapshot) => void;
}

export function ShareLink({
  pollId,
  onClosed,
}: ShareLinkProps): React.ReactElement {
  const { t } = useTranslation(["common", "errors"]);
  const [copied, setCopied] = useState(false);
  const [creatorToken, setCreatorToken] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = buildShareUrl(pollId);

  useEffect(() => {
    setCreatorToken(getCreatorTokenFromHash(window.location.hash));
  }, []);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("errors:generic", { ns: "errors" }));
    }
  };

  const closePoll = async (token: string): Promise<void> => {
    setClosing(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/polls/${pollId}/close`, {
        method: "POST",
        headers: { "x-creator-token": token },
      });
      if (!response.ok) {
        setError(t("errors:closeFailed", { ns: "errors" }));
        return;
      }
      const snapshot = (await response.json()) as PollSnapshot;
      onClosed?.(snapshot);
    } catch {
      setError(t("errors:generic", { ns: "errors" }));
    } finally {
      setClosing(false);
    }
  };

  return (
    <section aria-labelledby="share-heading" className="space-y-3">
      <h2 id="share-heading" className="text-lg font-semibold">
        {t("shareLink")}
      </h2>
      <div className="join w-full">
        <input
          type="text"
          readOnly
          className="input input-bordered join-item flex-1"
          value={shareUrl}
          aria-label={t("shareLink")}
        />
        <button
          type="button"
          className="btn btn-primary join-item"
          onClick={() => void copyLink()}
          aria-label={t("copyLink")}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? t("copied") : t("copyLink")}
        </button>
      </div>
      {creatorToken && (
        <button
          type="button"
          className="btn btn-warning w-full"
          onClick={() => void closePoll(creatorToken)}
          disabled={closing}
        >
          {closing ? t("closing") : t("closePoll")}
        </button>
      )}
      {error && (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
