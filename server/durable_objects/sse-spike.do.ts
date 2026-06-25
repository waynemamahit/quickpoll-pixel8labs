import { DurableObject } from "cloudflare:workers";

/** Throwaway spike DO — proves SSE via fetch + RPC broadcast on same instance. */
export class SseSpike extends DurableObject {
  private controllers = new Set<ReadableStreamDefaultController>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/stream")) {
      const stream = new ReadableStream({
        start: (controller) => {
          this.controllers.add(controller);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ connected: true })}\n\n`,
            ),
          );
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

  async broadcast(message: string): Promise<number> {
    const payload = new TextEncoder().encode(
      `data: ${JSON.stringify({ message })}\n\n`,
    );
    let sent = 0;
    for (const controller of this.controllers) {
      try {
        controller.enqueue(payload);
        sent += 1;
      } catch {
        this.controllers.delete(controller);
      }
    }
    return sent;
  }

  private cleanupControllers(): void {
    for (const controller of this.controllers) {
      if (controller.desiredSize === null) {
        this.controllers.delete(controller);
      }
    }
  }
}
