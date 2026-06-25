# realtime-results

> **Transport:** Server-Sent Events (SSE), per the constitution's realtime decision rule — the channel is server→client only (votes travel over HTTP), so SSE is selected over WebSocket.
> **Cloudflare bindings:** `DO_POLL` (Durable Object holds subscriber stream controllers and broadcasts).
> **Client:** `EventSource` (browser-native automatic reconnection).

## ADDED Requirements

### Requirement: Live result subscription over SSE

The system SHALL let any viewer of a poll subscribe to a Server-Sent Events stream and receive the poll's tallies in real time, so that all viewers converge on the same result without manual refresh.

#### Scenario: Snapshot is delivered on connect

- **WHEN** a client opens an `EventSource` to `GET /api/v1/polls/:id/stream`
- **THEN** the server responds with `Content-Type: text/event-stream` and immediately emits one `data:` event carrying the current `PollSnapshot` (tallies + status)

#### Scenario: Change is broadcast to all subscribers

- **WHEN** any vote is accepted or the poll is closed
- **THEN** the Durable Object enqueues an updated snapshot `data:` event to every currently connected stream of that poll

#### Scenario: Subscription is read-only

- **WHEN** a viewer is connected to the stream
- **THEN** the stream carries server→client snapshots only; votes and closes are performed over HTTP, never over the stream

### Requirement: Resilient delivery

The system SHALL keep viewers' results eventually consistent despite dropped connections, idle periods, and clients that cannot establish an SSE stream.

#### Scenario: Automatic reconnect after a dropped stream

- **WHEN** an open SSE stream is interrupted while the poll is still active
- **THEN** the `EventSource` reconnects automatically and, on reconnect, the server emits a fresh snapshot the client applies

#### Scenario: Fallback to polling when SSE is unavailable

- **WHEN** a client cannot establish an SSE stream after repeated attempts
- **THEN** the client falls back to fetching `GET /api/v1/polls/:id` on a fixed interval so tallies still update

#### Scenario: Streams are released when viewers leave

- **WHEN** a viewer closes the tab or navigates away
- **THEN** the Durable Object removes that stream's controller from its subscriber set so it is no longer broadcast to

### Requirement: Zero-state results render safely

The system SHALL render results for a poll that has received no votes without error and in a way that reads as "no votes yet".

#### Scenario: Fresh poll with no votes

- **WHEN** a viewer opens a poll whose `totalVotes` is 0
- **THEN** every option renders at 0% with a zero count
- **AND** percentage computation does not divide by zero

### Requirement: Accessible live updates

The system SHALL present live result changes in a way assistive technology can perceive, using internationalized copy.

#### Scenario: Tally updates are announced

- **WHEN** the results region updates from a new snapshot
- **THEN** the region is marked `aria-live="polite"` so screen readers announce the change without stealing focus

#### Scenario: Result labels are internationalized

- **WHEN** the results UI renders counts, percentages, and status labels
- **THEN** all user-facing text resolves through i18n keys (en + id), with no hardcoded strings
