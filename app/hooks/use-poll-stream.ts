import { useEffect, useState } from "react";
import type { PollSnapshot } from "../../shared/types/poll.types";

export function usePollStream(
  pollId: string,
  initial: PollSnapshot,
  onFallback?: () => void,
): PollSnapshot {
  const [snapshot, setSnapshot] = useState<PollSnapshot>(initial);

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let failures = 0;

    const startPolling = (): void => {
      if (pollInterval) {
        return;
      }
      onFallback?.();
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/polls/${pollId}`);
          if (res.ok) {
            const data = (await res.json()) as PollSnapshot;
            setSnapshot(data);
          }
        } catch {
          // ignore polling errors
        }
      }, 3000);
    };

    const connect = (): void => {
      source = new EventSource(`/api/v1/polls/${pollId}/stream`);

      source.onmessage = (event) => {
        failures = 0;
        try {
          const data = JSON.parse(event.data as string) as PollSnapshot;
          if (data.id) {
            setSnapshot(data);
          }
        } catch {
          // ignore malformed events
        }
      };

      source.onerror = () => {
        failures += 1;
        source?.close();
        source = null;
        if (failures >= 3) {
          startPolling();
        } else {
          setTimeout(connect, 1000 * failures);
        }
      };
    };

    connect();

    return () => {
      source?.close();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollId, onFallback]);

  return snapshot;
}
