# voting

> **Cloudflare bindings:** `DO_POLL` (authoritative tally + dedupe), `SHORT_RATE_LIMITER` (vote).
> **Validation:** `voteSchema` (`shared/schemas/poll.schema.ts`) via `@hono/zod-validator`.
> **Endpoint:** `POST /api/v1/polls/:id/vote` — CSRF/CORS validated against `CORS_ALLOWED_ORIGINS`; errors are i18n'd with a `correlationId`.
> **E2E:** Playwright vote flows seed inputs with the `from Playwright-E2E` data prefix.

## ADDED Requirements

### Requirement: Cast a vote

The system SHALL let any visitor with the poll link cast exactly one vote for one option of an open poll, and SHALL return the updated tallies in the response.

#### Scenario: Vote is accepted

- **WHEN** a visitor submits a valid `optionId` and `voterToken` for an open poll whose token has not been seen before
- **THEN** the system increments that option's tally by 1, persists it, records the voter token, and returns the updated `PollSnapshot` with `200`

#### Scenario: Vote for an unknown option

- **WHEN** a vote references an `optionId` that does not belong to the poll
- **THEN** the system returns `400` and changes no tally

### Requirement: One vote per browser

The system SHALL enforce, on a best-effort per-browser basis, that a given voter token counts at most once per poll, and SHALL make clear to users that this is not an identity-backed guarantee.

#### Scenario: Duplicate vote from the same browser is rejected

- **WHEN** a `voterToken` that has already voted on a poll submits another vote for that poll
- **THEN** the system returns `409` without changing any tally
- **AND** the client keeps showing the voter's existing choice

#### Scenario: Client locks the UI after voting

- **WHEN** a visitor has successfully voted in the current browser
- **THEN** the client persists `qp:voted:<pollId>`, disables the option controls, and shows "You voted: <option>" on this and future visits within the same browser

#### Scenario: Voter token is established on first visit

- **WHEN** a visitor opens a poll for the first time in a browser with no stored voter token
- **THEN** the client generates a random token and persists it as `qp:voter` before any vote is sent

### Requirement: Reject votes on closed or expired polls

The system SHALL refuse votes for polls that are closed or no longer exist.

#### Scenario: Vote on a closed poll

- **WHEN** a vote is submitted for a poll whose status is `closed`
- **THEN** the system returns `409` and the client surfaces that voting has ended

#### Scenario: Vote on an expired or unknown poll

- **WHEN** a vote is submitted for a poll id that does not exist or has expired
- **THEN** the system returns `404`

### Requirement: Vote submission is rate limited

The system SHALL apply the short-window rate limiter to the vote endpoint to blunt automated ballot stuffing.

#### Scenario: Excessive vote requests are throttled

- **WHEN** vote requests from a source exceed the configured short-window limit
- **THEN** the system returns `429` until the window resets

### Requirement: Vote errors are CSRF-protected and internationalized

The system SHALL protect the vote endpoint with origin-validated CSRF/CORS and surface all voter-facing outcomes through i18n keys.

#### Scenario: Vote from a disallowed origin is rejected

- **WHEN** a `POST /api/v1/polls/:id/vote` request arrives from an origin not in `CORS_ALLOWED_ORIGINS`
- **THEN** the system rejects it via the `csrf()` middleware before counting

#### Scenario: Voter-facing messages are internationalized

- **WHEN** a vote is rejected (`400`/`404`/`409`/`429`) or accepted
- **THEN** the message shown to the voter resolves through an i18n key (en + id), with no hardcoded strings
