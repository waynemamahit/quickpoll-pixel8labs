# poll-management

> **Cloudflare bindings:** `DO_POLL` (per-poll Durable Object store), `SHORT_RATE_LIMITER` (create).
> **Validation:** `createPollSchema` (`shared/schemas/poll.schema.ts`) at the boundary via `@hono/zod-validator`.
> **Endpoints:** `POST /api/v1/polls`, `GET /api/v1/polls/:id`, `POST /api/v1/polls/:id/close`.
> **Architecture:** Routes → `PollEngine` → `PollService` → `Poll` DO (Awilix request-scoped).

## ADDED Requirements

### Requirement: Create a poll

The system SHALL let any visitor create a poll consisting of one question and between 2 and 10 answer options, without requiring an account, and return a unique poll id plus a creator capability token.

#### Scenario: Valid poll is created

- **WHEN** a visitor submits a question of 1–200 characters with 2–10 non-empty option labels (each 1–80 characters)
- **THEN** the system creates a poll with status `open`, all option tallies at 0, a generated unguessable id, and an `expiresAt` 24 hours ahead
- **AND** returns `{ id, creatorToken, poll }` where `poll` is the public snapshot and `creatorToken` is shown only to the creator

#### Scenario: Question or options are invalid

- **WHEN** the question is empty or exceeds 200 characters, OR fewer than 2 non-empty options remain after trimming, OR more than 10 options are supplied, OR two option labels are identical after trimming
- **THEN** the system rejects the request with `400` and a field-level validation message
- **AND** does not create any poll

#### Scenario: Blank options are dropped before validation

- **WHEN** the submission contains blank or whitespace-only option rows alongside valid ones
- **THEN** the system trims and discards the blank rows before counting options against the 2–10 bound

### Requirement: Retrieve poll state

The system SHALL return the current public snapshot of a poll by its id for server-side rendering and as a polling fallback, and SHALL never expose the creator token or the set of voter tokens.

#### Scenario: Snapshot is returned for an existing poll

- **WHEN** a client requests a poll by a valid existing id
- **THEN** the system returns its `PollSnapshot` (id, question, options with tallies, status, totalVotes, timestamps, expiresAt) with `200`

#### Scenario: Unknown or expired poll

- **WHEN** a client requests a poll id that does not exist or has passed its expiry
- **THEN** the system returns `404`

#### Scenario: Secrets are never serialized

- **WHEN** any snapshot is produced for a non-creator response or an SSE broadcast
- **THEN** the payload contains no `creatorToken` and no voter token data

### Requirement: Shareable poll links

The system SHALL give the creator a link that anyone can open to vote and watch results, and a separate creator link that additionally grants the ability to close the poll, without exposing the creator capability to ordinary voters.

#### Scenario: Voters get a share link

- **WHEN** a poll has been created
- **THEN** the system provides a shareable URL of the form `/p/<id>` that the creator can copy, and which lets any opener view the poll and vote

#### Scenario: Creator link carries the capability out of band

- **WHEN** the creator is shown their poll after creation
- **THEN** the creator capability is conveyed in the URL **fragment** (`/p/<id>#c=<creatorToken>`), which is not transmitted to the server
- **AND** the plain share link `/p/<id>` contains no creator capability

### Requirement: Close a poll

The system SHALL allow only the holder of a poll's creator token to close it, after which the poll stops accepting votes while remaining viewable.

#### Scenario: Creator closes the poll

- **WHEN** a close request supplies the matching creator token via the `x-creator-token` header
- **THEN** the system sets status to `closed`, records `closedAt`, and broadcasts the updated snapshot to all connected viewers

#### Scenario: Close attempted without the creator token

- **WHEN** a close request is missing the creator token header or supplies a non-matching value
- **THEN** the system returns `403` and leaves the poll open

### Requirement: Polls expire automatically

The system SHALL automatically delete a poll's state after its time-to-live elapses so that storage stays bounded and stale links stop resolving.

#### Scenario: Expiry removes the poll

- **WHEN** 24 hours have elapsed since a poll was created
- **THEN** the system deletes the poll's stored state
- **AND** subsequent requests for that poll id return `404`

### Requirement: Mutation endpoints enforce CSRF/CORS and return internationalized errors

The system SHALL protect poll mutations with origin-validated CSRF/CORS and SHALL return production-safe, internationalized error responses with a correlation id.

#### Scenario: Disallowed origin is rejected

- **WHEN** a `POST /api/v1/polls` or `POST /api/v1/polls/:id/close` request arrives from an origin not in `CORS_ALLOWED_ORIGINS`
- **THEN** the system rejects it via the `csrf()` middleware before the handler runs

#### Scenario: Validation failure returns an i18n message

- **WHEN** create input fails `createPollSchema`
- **THEN** the system returns `400` with an error message resolved from an i18n key (en + id) and a `correlationId`, leaking no internal details

#### Scenario: Unexpected error is sanitized

- **WHEN** a handler throws unexpectedly
- **THEN** the global error handler returns `{ error, correlationId }` and logs the failure with sensitive fields (e.g. `creatorToken`) sanitized
