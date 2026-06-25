export function getCreatorTokenFromHash(hash: string): string | null {
  const match = hash.match(/^#c=(.+)$/);
  return match?.[1] ?? null;
}

export function buildShareUrl(pollId: string): string {
  if (typeof window === "undefined") {
    return `/p/${pollId}`;
  }
  return `${window.location.origin}/p/${pollId}`;
}
