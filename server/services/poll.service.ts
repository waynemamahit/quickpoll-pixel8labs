import type {
  CreatePollInput,
  VoteInput,
} from "../../shared/schemas/poll.schema";
import type { PollSnapshot } from "../../shared/types/poll.types";
import type { Poll } from "../durable_objects/poll.do";
import { PollDomainError } from "../errors/poll-domain.error";
import type { IPollService } from "../types/poll.types";

export class PollService implements IPollService {
  constructor(private readonly deps: { env: Env }) {}

  async init(
    id: string,
    input: CreatePollInput & { creatorToken: string },
  ): Promise<void> {
    const stub = this.getStub(id);
    await stub.init({ id, ...input });
  }

  async getSnapshot(id: string): Promise<PollSnapshot | null> {
    const stub = this.getStub(id);
    return stub.getSnapshot();
  }

  async vote(id: string, input: VoteInput): Promise<PollSnapshot> {
    const stub = this.getStub(id);
    try {
      return await stub.vote(input);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async close(id: string, creatorToken: string): Promise<PollSnapshot> {
    const stub = this.getStub(id);
    try {
      return await stub.close({ creatorToken });
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async stream(id: string, request: Request): Promise<Response> {
    const stub = this.getStub(id);
    const streamUrl = new URL(request.url);
    streamUrl.pathname = "/stream";
    return stub.fetch(new Request(streamUrl.toString(), request));
  }

  private getStub(id: string): DurableObjectStub<Poll> {
    const objectId = this.deps.env.DO_POLL.idFromName(id);
    return this.deps.env.DO_POLL.get(objectId);
  }

  private mapError(err: unknown): PollDomainError {
    if (err instanceof PollDomainError) {
      return err;
    }
    if (err instanceof Error) {
      return new PollDomainError(500, "errors.internal");
    }
    return new PollDomainError(500, "errors.internal");
  }
}
