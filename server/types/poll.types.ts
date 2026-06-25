import type {
  CreatePollInput,
  VoteInput,
} from "../../shared/schemas/poll.schema";
import type { PollSnapshot } from "../../shared/types/poll.types";

export type PollDomainErrorCode =
  | "poll.notFound"
  | "poll.closed"
  | "poll.duplicateVote"
  | "poll.unknownOption"
  | "poll.forbidden";

export interface PollDomainError {
  code: PollDomainErrorCode;
  status: number;
}

export interface CreatePollResult {
  id: string;
  creatorToken: string;
  poll: PollSnapshot;
}

export interface IPollService {
  init(
    id: string,
    input: CreatePollInput & { creatorToken: string },
  ): Promise<void>;
  getSnapshot(id: string): Promise<PollSnapshot | null>;
  vote(id: string, input: VoteInput): Promise<PollSnapshot>;
  close(id: string, creatorToken: string): Promise<PollSnapshot>;
  stream(id: string, request: Request): Promise<Response>;
}

export interface IPollEngine {
  create(input: CreatePollInput, locale?: string): Promise<CreatePollResult>;
  getSnapshot(id: string, locale?: string): Promise<PollSnapshot>;
  vote(id: string, input: VoteInput, locale?: string): Promise<PollSnapshot>;
  close(
    id: string,
    creatorToken: string,
    locale?: string,
  ): Promise<PollSnapshot>;
  stream(id: string, request: Request): Promise<Response>;
}
