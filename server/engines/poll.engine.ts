import type {
  CreatePollInput,
  VoteInput,
} from "../../shared/schemas/poll.schema";
import type { PollSnapshot } from "../../shared/types/poll.types";
import { PollDomainError } from "../errors/poll-domain.error";
import { initServerI18n, resolveLocale, t } from "../i18n/config";
import type { ILoggerService } from "../types/logger.types";
import type {
  CreatePollResult,
  IPollEngine,
  IPollService,
} from "../types/poll.types";

export class PollEngine implements IPollEngine {
  constructor(
    private readonly deps: {
      pollService: IPollService;
      loggerService: ILoggerService;
    },
  ) {}

  async create(
    input: CreatePollInput,
    locale = "en",
  ): Promise<CreatePollResult> {
    await initServerI18n();
    const id = crypto.randomUUID();
    const creatorToken = crypto.randomUUID();

    this.deps.loggerService.info("Creating poll", { pollId: id });

    await this.deps.pollService.init(id, { ...input, creatorToken });
    const poll = await this.deps.pollService.getSnapshot(id);

    if (!poll) {
      throw this.domainError("poll.notFound", 404, locale);
    }

    return { id, creatorToken, poll };
  }

  async getSnapshot(id: string, locale = "en"): Promise<PollSnapshot> {
    await initServerI18n();
    const poll = await this.deps.pollService.getSnapshot(id);
    if (!poll) {
      throw this.domainError("poll.notFound", 404, locale);
    }
    return poll;
  }

  async vote(
    id: string,
    input: VoteInput,
    locale = "en",
  ): Promise<PollSnapshot> {
    await initServerI18n();
    try {
      return await this.deps.pollService.vote(id, input);
    } catch (err) {
      throw this.mapDomainError(err, locale);
    }
  }

  async close(
    id: string,
    creatorToken: string,
    locale = "en",
  ): Promise<PollSnapshot> {
    await initServerI18n();
    try {
      return await this.deps.pollService.close(id, creatorToken);
    } catch (err) {
      throw this.mapDomainError(err, locale);
    }
  }

  async stream(id: string, request: Request): Promise<Response> {
    return this.deps.pollService.stream(id, request);
  }

  private mapDomainError(err: unknown, locale: string): PollDomainError {
    if (err instanceof PollDomainError) {
      return new PollDomainError(err.status, err.code, t(err.code, locale));
    }
    return this.domainError("errors.internal", 500, locale);
  }

  private domainError(
    code: string,
    status: number,
    locale: string,
  ): PollDomainError {
    return new PollDomainError(status, code, t(code, locale));
  }
}

export { resolveLocale };
