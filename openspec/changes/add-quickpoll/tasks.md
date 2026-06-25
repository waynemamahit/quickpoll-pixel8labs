# Tasks — QuickPoll

> Conforms to the constitution (`openspec/config.yaml`): clean architecture (Routes → Engine → Service) + Awilix DI, i18n (en+id), Logger + global error handler, SSE realtime, no `any`, explicit return types, **≥90% coverage** (unit/integration/E2E), `from Playwright-E2E` E2E data prefix.
> Each task is an atomic ≤2h chunk with file paths and acceptance criteria. Tests live in sibling `__tests__/` dirs.

## 0. De-risk (spike)

- [ ] 0.1 **SSE-from-DO spike:** prove a DO can return a `text/event-stream` `ReadableStream` via `stub.fetch(request)`, and that a later RPC method on the same `idFromName` instance can enqueue to the stored stream controllers (broadcast) — under `wrangler dev`. Throwaway; the realtime spec depends on it.
- [ ] 0.2 Confirm `pnpm dev` (Cloudflare vite plugin) serves `/api/v1/*` and the SSE endpoint locally; decide E2E target (`pnpm dev` vs `pnpm preview`). Record in `design.md` if it differs from Decision 3.

## 1. Foundational compliance (starter is missing these)

- [ ] 1.1 **DI container** — `server/containers/index.ts`: `createContainer()`, register services/engine with `asClass(...).scoped()`, request-scoped with `Env` injected per request. Add resolution middleware so handlers get a typed scope.
- [ ] 1.2 **Logger** — `server/services/logger.service.ts` implementing `ILoggerService` (`server/types/logger.types.ts`): correlation id per request, structured output, auto-sanitize fields matching `/password|token|secret|key|auth|credit|ssn|bearer/i`. Unit test: sanitization + correlation id propagation.
- [ ] 1.3 **Global error handler** — `server/middleware/error-handler.ts` wired via Hono `onError`: log with correlation id + request context, return `{ error, correlationId }` (production-safe). Unit test the mapping.
- [ ] 1.4 **Security config** — add `CORS_ALLOWED_ORIGINS` to `wrangler.jsonc` `vars` (+ `.dev.vars.example`); configure global `csrf({ origin })` and `/api/*` `cors({ origin })` to validate against it (replaces the bare `csrf()/cors()` in `server/app.ts`).
- [ ] 1.5 **i18n (frontend)** — `app/i18n/config.ts` + `locales/{en,id}/{common,errors,validation}.json`; wrap the app in the provider in `app/root.tsx`; set `<html lang>` from the active language (SSR-aware via cookie).
- [ ] 1.6 **i18n (backend)** — `server/i18n/config.ts` + `locales/{en,id}.json` for API error/notification messages; helper to resolve a message key + locale.
- [ ] 1.7 **Layout selectors** — `app/components/ThemeSelector.tsx` (DaisyUI `data-theme`, default `light`, localStorage) and `app/components/LanguageSelector.tsx` (`i18next.changeLanguage`, localStorage + cookie, Lucide flag icons), in a shared layout; keyboard-navigable + ARIA. Component tests for each.
- [ ] 1.8 **Test gates** — add the `coverage.thresholds` block (90% all metrics) to `vitest.config.ts`; set `use.baseURL: http://localhost:5173` + `webServer { command: "pnpm dev", url, reuseExistingServer: !CI }` in `playwright.config.ts`; add `e2e/helpers/test-data.ts` (`from Playwright-E2E` prefix helper).

## 2. Shared schemas, types, bindings

- [ ] 2.1 Create `shared/` and add `shared/types/poll.types.ts` (`PollOption`, `PollStatus`, `PollSnapshot`).
- [ ] 2.2 `shared/schemas/poll.schema.ts` — `createPollSchema` (question 1–200; 2–10 options; label 1–80; trim + drop blank; reject duplicate labels), `voteSchema` (`optionId`, `voterToken`); derive types via `z.infer`. Unit test valid + invalid inputs.
- [ ] 2.3 Backend contracts — `server/types/poll.types.ts`: `IPollService`, `IPollEngine` (+ domain-error union).
- [ ] 2.4 `wrangler.jsonc` — add `DO_POLL` binding + `new_sqlite_classes: ["Poll"]` migration tag; **remove unused `browser`/`ai`/`vectorize`**. Run `pnpm typecheck` to regenerate `worker-configuration.d.ts`.
- [ ] 2.5 Constants — `MAX_QUESTION=200`, `MAX_OPTIONS=10`, `MAX_OPTION_LABEL=80`, `TTL_HOURS=24`.

## 3. `Poll` Durable Object (source of truth) + SSE

- [ ] 3.1 `server/durable_objects/poll.do.ts` extending `DurableObject`, `ctx.storage` KV API (mirror `counter.do.ts`); hydrate in `blockConcurrencyWhile`.
- [ ] 3.2 `init(input)` — persist question/options/status=open/timestamps/`creatorToken`/empty voter set; set expiry alarm `TTL_HOURS` ahead.
- [ ] 3.3 `getSnapshot()` → `PollSnapshot` (computes `totalVotes`; **omits `creatorToken` + voter tokens**).
- [ ] 3.4 `vote({ optionId, voterToken })` — `409` closed / `400` unknown option / `409` duplicate token; else increment, persist, record token, `broadcast()`.
- [ ] 3.5 `close({ creatorToken })` — `403` mismatch; else status=closed + `closedAt`, `broadcast()`.
- [ ] 3.6 SSE: DO `fetch` handler returns a `text/event-stream` `ReadableStream`; store each stream's controller in a `Set`; emit a snapshot immediately on connect; remove the controller on cancel.
- [ ] 3.7 `broadcast()` — enqueue `data: <PollSnapshot JSON>\n\n` to every controller; drop failed controllers.
- [ ] 3.8 `alarm()` → `ctx.storage.deleteAll()`.
- [ ] 3.9 Unit tests (`@cloudflare/vitest-pool-workers`): vote increments; double-vote `409`; closed-poll `409`; snapshot hides secrets; zero-state `totalVotes===0`; expiry deletes. (SSE broadcast covered by integration/E2E.)

## 4. Service + Engine + routes (Routes → Engine → Service)

- [ ] 4.1 `server/services/poll.service.ts` (`IPollService`) — wraps `env.DO_POLL`: `idFromName(id).get()` for RPC (`init/getSnapshot/vote/close`) and `stream()` via `stub.fetch()`. Unit test with a mocked `DurableObjectNamespace`.
- [ ] 4.2 `server/engines/poll.engine.ts` (`IPollEngine`) — business rules: mint `id` + `creatorToken`, validate, map domain errors → status + i18n key; orchestrates `IPollService` + `ILoggerService`. Unit test the rules + error mapping.
- [ ] 4.3 Register `pollService`, `pollEngine`, `loggerService` in `server/containers/index.ts` (scoped).
- [ ] 4.4 `server/routes/v1/polls.ts` (thin) — `POST /` (`zValidator("json", createPollSchema)`, `SHORT_RATE_LIMITER`) → engine.create; `GET /:id`; `POST /:id/vote` (`voteSchema`, `SHORT_RATE_LIMITER`); `POST /:id/close` (`x-creator-token`); `GET /:id/stream` (assert no `Upgrade`, return SSE Response). Mount under `apiV1`.
- [ ] 4.5 Export the `Poll` DO from `server/app.ts` (alongside `Counter`).
- [ ] 4.6 Integration tests (Hono `app.request()`): each endpoint incl. `400/403/404/409`, **CSRF allowed vs disallowed origin**, CORS behavior, correlation-id on errors, SSE handshake returns `text/event-stream`.

## 5. Frontend (React Router) — create + vote/results

- [ ] 5.1 Replace `app/routes/home.tsx` with `CreatePollForm` (`app/components/CreatePollForm.tsx`): question + dynamic option rows (add/remove, min 2 / max 10), client-side `createPollSchema` validation, DaisyUI form layout (`form-control`, `input input-bordered`, `aria-invalid`/`aria-describedby`), all copy via i18n keys. Submit `fetch('POST /api/v1/polls')`, redirect to `/p/:id#c=<creatorToken>`.
- [ ] 5.2 `app/routes/poll.tsx` + register `/p/:id` in `app/routes.ts`; `loader` SSR-fetches `GET /api/v1/polls/:id` (`404`→not-found). No `action`.
- [ ] 5.3 Vote UI (`app/components/PollVote.tsx`): option buttons; `fetch('POST /:id/vote')` with `qp:voter`; optimistic select, reconcile with returned snapshot; lock + "You voted: X" when `qp:voted:<id>`; bootstrap `qp:voter` on first visit.
- [ ] 5.4 Live results (`app/components/PollResults.tsx` + `app/hooks/use-poll-stream.ts`): `EventSource('/api/v1/polls/:id/stream')` (auto-reconnect); DaisyUI bars with count + %, **guard divide-by-zero at 0 votes**; `aria-live="polite"`; on persistent SSE failure, poll `GET /:id` every 3s.
- [ ] 5.5 Share + creator (`app/components/ShareLink.tsx`): always show copy-share-link for `/p/:id`; if `location.hash` carries `#c=<token>`, show "Close poll" → `POST /:id/close` with `x-creator-token`.
- [ ] 5.6 States: closed / empty-results / not-found / expired; mobile-first; skip-link + semantic landmarks.
- [ ] 5.7 Component tests (RTL): form validation, vote interaction, results render + zero-state, snapshot-driven update, share-link copy.

## 6. Cross-cutting verification

- [ ] 6.1 A11y pass: skip-link, labelled controls, keyboard operability, visible focus, `aria-live` results, WCAG AA contrast.
- [ ] 6.2 i18n pass: no hardcoded user-facing strings (front + back); en + id complete; language switch persists.
- [ ] 6.3 Quality gate: `pnpm lint` clean, `pnpm typecheck` green (no `any`, explicit return types), `pnpm test:cov` ≥90% all metrics.

## 7. E2E + ship

- [ ] 7.1 Playwright happy path (`e2e/quickpoll.spec.ts`): create poll (inputs use `e2eData(...)` → `from Playwright-E2E` prefix) → open `/p/:id` in two contexts → vote in one → assert the other updates **live** via SSE.
- [ ] 7.2 Playwright edge: double-vote blocked; creator closes → voting disabled for everyone; bogus id → not-found. All inputs prefixed `from Playwright-E2E`.
- [ ] 7.3 README to the brief's 8 points (what/run, who+one job, why+evidence, prior art+why-anyway, scope in/out, assumptions, 3 user questions, how-we-know + next).
- [ ] 7.4 **Deploy:** `node scripts/gen-wrangler.js production` (resolves/strips placeholder bindings) → `wrangler deploy`; `DO_POLL` created by deploy. Verify the live `*.workers.dev` link opens and a real vote propagates live across two devices; paste the URL into the README.
