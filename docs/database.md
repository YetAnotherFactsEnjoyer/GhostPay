# GhostPay database

Users own merchants. Merchants own terminals. Payments belong to terminals and
carry a stable local payment ID. Synchronization batches belong to a terminal
and record the payment IDs processed together.

Flyway migrations in `backend/src/main/resources/db/migration` are the source
of schema changes. Do not edit applied migrations; add a new versioned
migration instead.

## Constraints and operations

Six migrations create the schema. V2 converts preexisting numeric user IDs to generated
UUIDs; do not edit it after application. User email is unique; merchant/terminal references
are foreign keys. Payments enforce positive amounts, MYR, ACCEPTED status and uniqueness of
`(terminal_id, local_payment_id)`. Batches enforce `(terminal_id, batch_id)` uniqueness;
events enforce unique `(sync_batch_id, position)` and supported result statuses.

The terminal row is locked for synchronization. Payment, batch and event writes share one
transaction. Concurrency and a forced second-payment database failure are verified against
PostgreSQL in the integration suite. Indexes cover merchant ownership, merchant terminals,
terminal payments and batch/event unique keys. Lists are unpaginated; large histories need
a future measured pagination change. Do not use this simulator for unbounded production
payment volumes.

Compose initializes its own named persistent volume. Never reset an existing volume to
repair credentials or migrations. See [Docker operations](docker.md). The release audit
uses a separate project volume and Testcontainers databases, retaining existing data.
