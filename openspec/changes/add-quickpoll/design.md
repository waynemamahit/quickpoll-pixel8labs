# Design — QuickPoll

## Context

QuickPoll: pose a question, share a link, watch votes land live. Built on the React Router v8 + Cloudflare Workers starter and **conformant to the project constitution** (`openspec/config.yaml`). Each poll is one **Durable Object** instance — the constitution's prescribed primitive for stateful realtime — giving per-poll serialized state, an in-memory home for subscriber streams, and a per-object expiry alarm, with no external database.

Audience and bar: **for** anyone coordinating a small group in the moment (team lead, organizer, teacher); **one job done well** — get a group to a visible, shared decision in seconds; works on a phone, no account.

> **Constitution conformance note.** This design deliberately follows the constitution even where it exceeds a minimal prototype: clean architecture (Routes → Engine → Service) with Awilix DI, i18n (en+id), Logger + global error handler, and 90% coverage. The starter currently ships none of these wired up, so they are built as Phase 0–1 foundations.

## Goals

- Create → share → vote → see-live in well under a minute, mobile and desktop.
- Authoritative tallies: a viewer sees the DO's count, never a client guess.
- Zero setup for voters; the only "auth" is possession of an unguessable link.
- Survive dropped connections, double-submit, refresh, late joiners.
- Ship to a live `*.workers.dev` URL with no external resources provisioned.

## Non-Goals

Identity / ballot-box integrity (best-effort per-browser dedupe only); accounts; editing after creation; multi-select / ranked-choice; comments; CSV export; embeds; Drizzle/D1/Hyperdrive (the DO is the store — relational persistence is unjustified for ≤10 options that live ≤24h).

## Cloudflare services used (and why)

| Service | Binding | Why (per Service Selection Guide) |
| --- | --- | --- |
| **Durable Objects** | `DO_POLL` | Stateful realtime; one DO per poll = serialized vote counting + SSE fan-out |
| **Rate Limiter** | `SHORT_RATE_LIMITER` | Edge throttling on create/vote to blunt ballot stuffing |
| **Assets** | `ASSETS` | Serve the built client |

Deliberately **removed** for this change: `BROWSER`, `AI`, `VECTORIZE` (unused; can require a paid plan / block deploy). `D1`/`HYPERDRIVE`/`KV`/`R2` left to `gen-wrangler.js` to strip when their `${...}` placeholders are unresolved.

## Architecture (Routes → Engine → Service)

```
┌──────────────────────────────────────────────────────────────────┐
│ Routes / Controllers (thin, no business logic)                     │
│  • Hono: server/routes/v1/polls.ts (+ zValidator at the boundary)  │
│  • React Router: app/routes/home.tsx (create), poll.tsx (SSR read) │
└───────────────┬────────────────────────────────────────────────────┘
                │ resolves request-scoped container → calls
┌───────────────▼────────────────────────────────────────────────────┐
│ Engine: PollEngine (IPollEngine)  — business rules                  │
│  • mint id + creatorToken, validate, map domain errors → i18n + code │
│  • orchestrates 2+ services: IPollService + ILoggerService           │
└───────────────┬────────────────────────────────────────────────────┘
                │ delegates
┌───────────────▼────────────────────────────────────────────────────┐
│ Service: PollService (IPollService) — DO integration only           │
│  • idFromName(pollId).get() → RPC (init/getSnapshot/vote/close)      │
│  • stream(): forwards the SSE upgrade request via stub.fetch()       │
└───────────────┬────────────────────────────────────────────────────┘
                │ owns state + fan-out
┌───────────────▼────────────────────────────────────────────────────┐
│ Poll Durable Object (server/durable_objects/poll.do.ts)             │
│  • ctx.storage KV API (sqlite class) · Set<SSE controllers>          │
│  • vote/close mutate → broadcast() enqueues to every open stream     │
│  • alarm() → deleteAll() at TTL                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Engine justification (constitution: *don't create an engine that just proxies one service*): `PollEngine` holds real business logic (token minting, validation orchestration, domain-error→i18n/status mapping) and orchestrates **two** services (`IPollService` + `ILoggerService`), so the layer is warranted. Service/engine **contracts are interfaces** in `server/types/`; registered in `server/containers/index.ts` with `asClass(...).scoped()`, injecting `Env` per request.

## Key Decisions

### Decision 1: One DO per poll, KV storage API on a SQLite-backed class
`env.DO_POLL.idFromName(pollId)` → one instance per poll. State persisted with the `ctx.storage.get/put` KV API (mirrors `counter.do.ts`); class registered under `new_sqlite_classes` (free-tier). No raw SQL — KV API suffices for ≤10 options. Rejected: D1/KV namespace (eventual consistency / read-amplification), raw SQLite (needless ceremony).

### Decision 2: One surface — everything through Hono `/api/v1/polls/*`; React Router does SSR reads only
All create/read/vote/close go through Hono, called by the client with `fetch()`. The `/p/:id` `loader` SSR-fetches the snapshot only. **No React Router `action`** — SSE cannot be served from one anyway, so a single Hono surface avoids a split brain and keeps CSRF/validation in one place.

### Decision 3: Realtime over **SSE** (constitution decision rule), votes over HTTP
The realtime channel is **server→client only** (snapshots), and votes go over HTTP — so the constitution's rule selects **SSE, not WebSocket**. `GET /api/v1/polls/:id/stream` → `PollService.stream()` → `stub.fetch()` → the DO returns a `text/event-stream` `ReadableStream`; the DO keeps each stream's controller in an in-memory `Set`. On vote/close, the DO's RPC method mutates then `broadcast()` enqueues `data: <PollSnapshot JSON>\n\n` to every controller. Same `idFromName(pollId)` instance, so the vote RPC and the open streams share one object. Client uses `EventSource` (**automatic reconnection** — removes manual backoff); if SSE is blocked end-to-end, fall back to `GET /:id` polling every ~3s.
- **Trade-off:** an open SSE stream keeps the DO resident (no hibernation savings). Acceptable for short-lived polls; simpler than hibernatable WebSockets and matches the constitution.
- **⚠ Spike first (task 0.1):** prove a DO can return an SSE stream via `stub.fetch()` and that a later RPC call broadcasts to those controllers, under `wrangler dev`. *(Validated via `SseSpike` DO + `@cloudflare/vitest-pool-workers`.)*
- **E2E target (task 0.2):** Playwright uses `pnpm dev` at `http://localhost:5173` (Cloudflare Vite plugin serves `/api/v1/*` and SSE locally). `pnpm preview` is for production-like Wrangler-only smoke tests, not primary E2E.

### Decision 4: Best-effort single vote via client voter token
First visit generates a random `voterToken` in `localStorage` (`qp:voter`), sent with each vote; the DO records seen tokens and rejects repeats (`409`). Client also stores `qp:voted:<id>` to lock the UI. Honest in UI + README: clearing storage / switching browser circumvents it. Rejected IP dedupe (NAT/mobile) and fingerprinting (privacy).

### Decision 5: Creator close via capability token in the URL **fragment**
Create returns `{ id, creatorToken }`. Creator link `/p/:id#c=<token>` — the fragment is never sent to the server (kept out of logs, `Referer`, history); read client-side, sent as `x-creator-token` header on `POST /:id/close`. Defense-in-depth on top of the LoggerService's automatic `token|secret|…` sanitization. Share link is the plain `/p/:id`.

### Decision 6: Auto-expiry via DO alarm
On create, set an alarm `TTL_HOURS` (default 24h) ahead; `alarm()` runs `ctx.storage.deleteAll()`. Closing does not delete (final results viewable until expiry). Bounds storage; fits "decide now".

## Sequence — create → vote → live broadcast

```
Creator         Hono route        PollEngine        PollService        Poll DO            Viewer (EventSource)
  │ POST /polls      │                 │                 │                │                       │
  │─────────────────▶│ zValidator      │                 │                │                       │
  │                  │────────────────▶│ mint id+token   │                │                       │
  │                  │                 │ validate, log   │                │                       │
  │                  │                 │────────────────▶│ init(...)─────▶│ persist, set alarm    │
  │  {id,creatorTok} │◀────────────────│◀────────────────│◀───────────────│                       │
  │◀─────────────────│                 │                 │                │                       │
  │  share /p/:id    │                 │                 │   GET /:id/stream (SSE) ───────────────▶│ open stream
  │                  │                 │                 │────stub.fetch()───────▶│ register ctrl ─▶│ ← snapshot
  Voter POST /:id/vote ───────────────▶│ vote rules      │────────────────▶│ vote()──┐            │
  │                  │                 │                 │                │  inc+persist           │
  │                  │                 │                 │                │  broadcast() ─────────▶│ ← snapshot (live)
  │  200 snapshot    │◀────────────────│◀────────────────│◀───────────────│         └──            │
```

## Security (CSRF / CORS / Auth / Rate limiting)

- **CSRF:** global `csrf()` configured per constitution with `origin` validated against `CORS_ALLOWED_ORIGINS` (which must be **added** to `wrangler.jsonc` vars — currently missing). Same-origin browser `fetch` passes; the SSE `GET` is unaffected. Integration tests assert allowed vs disallowed origins are accepted/rejected.
- **CORS:** `cors()` on `/api/*` with origins from `CORS_ALLOWED_ORIGINS`.
- **Auth:** none for voting (link possession); close is a bearer capability (`x-creator-token`).
- **Rate limiting:** scoped `SHORT_RATE_LIMITER` (20/10s) on create + vote. Note: under `wrangler dev`, `cf-connecting-ip` is empty → all requests share one key; scope limits so the two-voter happy path doesn't trip.

## Error handling & logging

Hono `onError` → `server/middleware/error-handler.ts` returns `{ error, correlationId }` (production-safe); `LoggerService` (`ILoggerService`) assigns a correlation id per request, logs with request context, and **auto-sanitizes** `password|token|secret|key|auth|...`. Domain errors map to status + i18n message keys: closed→`409`, duplicate vote→`409`, unknown option→`400`, missing/expired→`404`, bad creator token→`403`, validation→`400`.

## Internationalization (en + id)

- **Frontend** `react-i18next`: `app/i18n/config.ts` + `locales/{en,id}/{common,errors,validation}.json`. No hardcoded strings.
- **Backend** `i18next`: `server/i18n/` (`en.json`, `id.json`) for API error/notification messages.
- **Selectors** in the layout: `LanguageSelector` (persists localStorage + cookie for SSR) and `ThemeSelector` (DaisyUI `data-theme`, default `light`), keyboard-navigable with ARIA.

## Accessibility

Semantic landmarks (`<main>`, `<nav>`, `<section>`); skip-link as first focusable; every input has a `<label htmlFor>` with `aria-invalid`/`aria-describedby` on errors; option controls keyboard-operable with visible focus; results region is `aria-live="polite"` so live tallies are announced without stealing focus; WCAG 2.1 AA contrast via DaisyUI tokens.

## Performance

- DO is single-region: distant voters see modest latency — fine for this use; not sharded.
- Lazy-import heavy modules; minimal top-level worker code (cold start).
- Zero-state guards: fresh poll `totalVotes === 0` → bars at 0%, no divide-by-zero.

## Data Model

```ts
// shared/types/poll.types.ts
export interface PollOption { id: string; label: string; votes: number; }          // label 1..80
export const PollStatus = { Open: "open", Closed: "closed" } as const;
export type PollStatus = (typeof PollStatus)[keyof typeof PollStatus];
export interface PollSnapshot {
  id: string; question: string; options: PollOption[]; status: PollStatus;
  totalVotes: number; createdAt: number; closedAt: number | null; expiresAt: number;
}
// Persisted in DO but NEVER serialized: creatorToken: string; voterTokens: string[]
```

## API Surface

| Method | Path | Purpose | Auth / limit | Validation |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/polls` | Create | CSRF + `SHORT_RATE_LIMITER` | `createPollSchema` |
| GET | `/api/v1/polls/:id` | Snapshot (SSR + fallback) | by link | — |
| POST | `/api/v1/polls/:id/vote` | Vote | CSRF + `SHORT_RATE_LIMITER` | `voteSchema` |
| POST | `/api/v1/polls/:id/close` | Close | `x-creator-token` | header |
| GET | `/api/v1/polls/:id/stream` | SSE snapshots | by link | — |

SSE event: `data: <PollSnapshot JSON>`. Voting/closing happen only over HTTP.

## Open Questions & Assumptions

- **Assumed** low-stakes, casual use — model is "unguessable link + best-effort dedupe"; not for elections (stated in README).
- **Assumed** tens–low-hundreds concurrent per poll; one DO fans out fine; no sharding.
- **Assumed** 24h TTL fits "decide now".
- **Open:** allow changing your vote while open? v1 = no. Show results before voting, or gate them? v1 = show immediately.

## Three questions for a real user (before building more)

1. Last time you needed a quick group decision, what did you use — and what made you abandon it?
2. Does seeing the running tally *before* you vote change your answer — do you want it shown or hidden?
3. Would you ever need the result later (a record), or is it disposable once decided?

## How we'll know it's working / what's next

Activation (≥2 votes), time-to-first-vote, SSE connect-success + broadcast latency; qualitatively, people stop hand-counting reactions. **Next:** allow vote-changing; optional hide-results-until-voted; QR for in-room sharing; multi-select; durable result permalinks.
