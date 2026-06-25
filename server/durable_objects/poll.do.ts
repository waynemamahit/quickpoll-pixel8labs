import { DurableObject } from "cloudflare:workers";
import { TTL_HOURS } from "../../shared/constants/poll.constants";
import type { CreatePollInput } from "../../shared/schemas/poll.schema";
import type { PollOption, PollSnapshot } from "../../shared/types/poll.types";
import { PollStatus } from "../../shared/types/poll.types";
import { PollDomainError } from "../errors/poll-domain.error";

export { PollDomainError };

interface PersistedPollState {
  id: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  creatorToken: string;
  voterTokens: string[];
  createdAt: number;
  closedAt: number | null;
  expiresAt: number;
}

export class Poll extends DurableObject {
  private state: PersistedPollState | null = null;
  private controllers = new Set<ReadableStreamDefaultController>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<PersistedPollState>("state")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/stream")) {
      if (!this.state) {
        return new Response("Not found", { status: 404 });
      }

      const stream = new ReadableStream({
        start: (controller) => {
          this.controllers.add(controller);
          controller.enqueue(this.formatEvent(this.buildSnapshot()));
        },
        cancel: () => {
          this.cleanupControllers();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async init(input: {
    id: string;
    question: string;
    options: { label: string }[];
    creatorToken: string;
  }): Promise<void> {
    const now = Date.now();
    const expiresAt = now + TTL_HOURS * 60 * 60 * 1000;
    const options: PollOption[] = input.options.map((opt) => ({
      id: crypto.randomUUID(),
      label: opt.label,
      votes: 0,
    }));

    this.state = {
      id: input.id,
      question: input.question,
      options,
      status: PollStatus.Open,
      creatorToken: input.creatorToken,
      voterTokens: [],
      createdAt: now,
      closedAt: null,
      expiresAt,
    };

    await this.ctx.storage.put("state", this.state);
    await this.ctx.storage.setAlarm(expiresAt);
  }

  async getSnapshot(): Promise<PollSnapshot | null> {
    if (!this.state) {
      return null;
    }
    return this.buildSnapshot();
  }

  async vote(input: {
    optionId: string;
    voterToken: string;
  }): Promise<PollSnapshot> {
    if (!this.state) {
      throw new PollDomainError(404, "poll.notFound");
    }
    if (this.state.status === PollStatus.Closed) {
      throw new PollDomainError(409, "poll.closed");
    }
    if (this.state.voterTokens.includes(input.voterToken)) {
      throw new PollDomainError(409, "poll.duplicateVote");
    }

    const option = this.state.options.find((o) => o.id === input.optionId);
    if (!option) {
      throw new PollDomainError(400, "poll.unknownOption");
    }

    option.votes += 1;
    this.state.voterTokens.push(input.voterToken);
    await this.ctx.storage.put("state", this.state);

    const snapshot = this.buildSnapshot();
    this.broadcast(snapshot);
    return snapshot;
  }

  async close(input: { creatorToken: string }): Promise<PollSnapshot> {
    if (!this.state) {
      throw new PollDomainError(404, "poll.notFound");
    }
    if (this.state.creatorToken !== input.creatorToken) {
      throw new PollDomainError(403, "poll.forbidden");
    }

    this.state.status = PollStatus.Closed;
    this.state.closedAt = Date.now();
    await this.ctx.storage.put("state", this.state);

    const snapshot = this.buildSnapshot();
    this.broadcast(snapshot);
    return snapshot;
  }

  async alarm(): Promise<void> {
    this.controllers.clear();
    await this.ctx.storage.deleteAll();
    this.state = null;
  }

  private buildSnapshot(): PollSnapshot {
    if (!this.state) {
      throw new PollDomainError(404, "poll.notFound");
    }

    const totalVotes = this.state.options.reduce((sum, o) => sum + o.votes, 0);
    return {
      id: this.state.id,
      question: this.state.question,
      options: this.state.options.map((o) => ({ ...o })),
      status: this.state.status,
      totalVotes,
      createdAt: this.state.createdAt,
      closedAt: this.state.closedAt,
      expiresAt: this.state.expiresAt,
    };
  }

  private broadcast(snapshot: PollSnapshot): void {
    const payload = this.formatEvent(snapshot);
    for (const controller of this.controllers) {
      try {
        controller.enqueue(payload);
      } catch {
        this.controllers.delete(controller);
      }
    }
  }

  private formatEvent(
    snapshot: PollSnapshot | Record<string, unknown>,
  ): Uint8Array {
    return new TextEncoder().encode(`data: ${JSON.stringify(snapshot)}\n\n`);
  }

  private cleanupControllers(): void {
    for (const controller of this.controllers) {
      if (controller.desiredSize === null) {
        this.controllers.delete(controller);
      }
    }
  }
}

export type { CreatePollInput };
