const VOTER_KEY = "qp:voter";

export function getVoterToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  let token = localStorage.getItem(VOTER_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, token);
  }
  return token;
}

export function getVotedOptionId(pollId: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(`qp:voted:${pollId}`);
}
