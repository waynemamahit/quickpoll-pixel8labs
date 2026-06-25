# QuickPoll

Instant live group decisions — create a poll, share a link, watch votes land in real time.

**Live demo:**
**Production:** https://quickpoll-pixel8labs.wayne-mamahit.workers.dev/
**Staging:** https://quickpoll-pixel8labs-staging.wayne-mamahit.workers.dev/

## What it is / how to run

QuickPoll lets anyone pose a question, share `/p/:id`, and see results update live via SSE. No accounts required.

```bash
pnpm install
pnpm dev          # http://localhost:5173 — API at /api/v1/*
pnpm test:cov     # unit + workers tests, ≥90% coverage
pnpm test:e2e     # Playwright (starts pnpm dev automatically)
pnpm preview      # http://127.0.0.1:8787
```

Copy `.dev.vars.example` → `.dev.vars` and set `CORS_ALLOWED_ORIGINS=http://localhost:5173`.

## Who it's for / one job

**For:** team leads, organizers, teachers coordinating a small group in the moment.

**One job:** get a group to a visible, shared decision in well under a minute — mobile-friendly, zero setup for voters.

## Why this exists / evidence

Chat polls bury results in scrollback; Google Forms needs accounts and spreadsheets; Slack polls need a workspace. The universal workaround — "👍 react to vote" — is counted by hand and lost when the thread scrolls. QuickPoll optimizes for **time-to-decision** and **live visibility**.

## Prior art / why build anyway

Doodle/When2meet (scheduling, not general polls), StrawPoll (extra steps, weak live feel), chat reactions (no persistent tally). QuickPoll combines **unguessable link + live SSE tallies + one DO per poll** on Cloudflare's edge with no external DB.

## Scope

**In:** create poll (2–10 options), share link, vote, live results (SSE), creator close, 24h auto-expiry, en+id i18n, best-effort single vote per browser.

**Out:** accounts, ballot-box integrity, ranked-choice, editing after create, comments, CSV export, embeds, D1/KV persistence.

## Assumptions

- Low-stakes, casual use — not for elections (best-effort dedupe via `localStorage` voter token).
- Tens–low-hundreds of concurrent viewers per poll; one Durable Object fans out SSE.
- 24h TTL fits "decide now"; closed polls remain viewable until expiry.

## Three questions for a real user

1. Last time you needed a quick group decision, what did you use — and what made you abandon it?
2. Does seeing the running tally *before* you vote change your answer — show or hide?
3. Would you need the result later, or is it disposable once decided?

## How we know it's working / what's next

- **Metrics:** ≥2 votes per poll (activation), time-to-first-vote, SSE connect + broadcast latency.
- **Tests:** Vitest (unit + Workers integration) ≥90% coverage; Playwright E2E with `from Playwright-E2E` data prefix.
- **Next:** vote-changing while open; hide-results-until-voted; QR share; multi-select; durable result permalinks.

## Architecture

- **Poll Durable Object** (`DO_POLL`) — source of truth + SSE fan-out
- **Hono API** `/api/v1/polls/*` — Routes → `PollEngine` → `PollService` → DO
- **React Router** `/` create, `/p/:id` vote + live results (`EventSource`)

See `openspec/changes/add-quickpoll/design.md` for full design decisions.
