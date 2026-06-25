# Add QuickPoll — instant live group decisions

> Change ID: `add-quickpoll` · Status: proposed · Owner: waynemamahit

## Why

Small groups make low-stakes decisions constantly — where to eat, which time works, which topic first — and the tooling is worse than the problem: chat polls bury results in scrollback, Forms need an account and a spreadsheet round-trip, Slack add-ons need a workspace install. None gets a group from "let's decide" to "decided" in ~30 seconds with zero setup. The workaround is universal and visible: "👍 react to vote", counted by hand, lost when the thread scrolls.

**QuickPoll's one job:** one person poses a question, everyone else opens a link and votes, and the result is visible to all of them the instant the last vote lands — no login, no install, no refresh.

Per the **Cloudflare Service Selection Guide**, each poll is one **Durable Object** (the row for *stateful realtime*). Results stream one-way to viewers via **SSE** — applying the guide's decision rule ("use SSE unless the client needs to send messages to the server"): votes travel over HTTP, so the realtime channel is server→client only.

## What Changes

- **NEW** capabilities: `poll-management`, `voting`, `realtime-results`.
- **NEW** `Poll` Durable Object — per-poll source of truth (`ctx.storage` KV API on a SQLite-backed class), holds SSE subscriber streams, broadcasts on change, self-deletes on an expiry alarm.
- **NEW** clean-architecture backend (Routes → Engine → Service): `PollService` (DO integration) ← `PollEngine` (business rules) ← Hono routes, wired through an **Awilix request-scoped container** (`server/containers/`).
- **NEW** Hono API: `POST /api/v1/polls`, `GET /:id`, `POST /:id/vote`, `POST /:id/close`, `GET /:id/stream` (SSE).
- **NEW** React Router routes `/` (create) and `/p/:id` (vote + live results); `EventSource` client with built-in auto-reconnect.
- **NEW** shared Zod schemas + types validated at the boundary with `@hono/zod-validator`.
- **Foundational compliance** the starter lacks but the constitution mandates: `LoggerService` + global error handler (correlation IDs, sanitization), **i18n (en + id)** front and back with Language/Theme selectors, `CORS_ALLOWED_ORIGINS` var + origin-validated `csrf()`/`cors()`, vitest 90% thresholds, Playwright `baseURL`/`webServer`, and the `from Playwright-E2E` E2E data prefix.

## Non-goals

Accounts/auth; identity-backed one-person-one-vote (best-effort per-browser only); multi-select / ranked-choice; editing a poll after creation; comments; CSV export; embeds; Drizzle/D1/Hyperdrive persistence (the DO is the store). Rationale and "what's next" live in `design.md`.

## Success metrics

- **Activation:** % of created polls receiving ≥2 votes.
- **Time-to-first-vote:** median seconds from creation to first vote.
- **Liveness:** SSE connect-success rate and median vote→other-viewers-updated latency.
- **Quality gate:** ≥90% coverage (statements/branches/functions/lines) across unit/integration/E2E, all green; Biome + `tsc` clean (no `any`).

## Impact

- **Affected specs:** new `poll-management`, `voting`, `realtime-results`.
- **Affected code:** `server/` (durable_objects, services, engines, routes/v1, containers, middleware, i18n, types), `app/` (routes, components, i18n, hooks), `shared/` (schemas, types), `wrangler.jsonc` (add `DO_POLL` + `CORS_ALLOWED_ORIGINS`; remove unused `browser`/`ai`/`vectorize`), `vitest.config.ts` (thresholds), `playwright.config.ts` (`baseURL`/`webServer`).
- **Risk:** full constitution compliance (DI + Logger + i18n en/id + 90% coverage) materially exceeds a 1-day prototype — foundational scaffolding is built in Phase 0–1. SSE-from-DO cross-method broadcast is de-risked by a spike before the realtime build.
