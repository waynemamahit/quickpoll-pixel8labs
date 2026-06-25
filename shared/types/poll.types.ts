export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export const PollStatus = {
  Open: "open",
  Closed: "closed",
} as const;

export type PollStatus = (typeof PollStatus)[keyof typeof PollStatus];

export interface PollSnapshot {
  id: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  totalVotes: number;
  createdAt: number;
  closedAt: number | null;
  expiresAt: number;
}
