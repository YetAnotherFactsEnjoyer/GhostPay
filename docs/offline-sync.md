# Offline synchronization

Payment recording writes a stable UUID, user subject, terminal ID, reference, positive
integer amount in MYR minor units, and timestamp to the browser's `ghostpay` IndexedDB.
A successful save is shown only after IndexedDB commits. Storage failures surface as errors.
No local record is deleted during synchronization or logout.

New payments are `PENDING`. Sync creates a batch of at most 100 pending payments in
insertion order. A single IndexedDB transaction stores the batch UUID and ordered payment
IDs and marks its payments `SYNCING` before sending HTTP. Web Locks coordinate tabs where
available; the atomic IndexedDB batch claim and backend idempotency also protect retries.

An interrupted batch is retried first with its original ID, content, and order. A different
selection is rejected until the interrupted batch is retried. New selected batches contain
only selected pending IDs. Sync all processes one batch per terminal per click; repeat for
queues larger than 100. Synchronization is manual; automatic/mobile-network policy controls
are explicitly disabled in this release.

The backend locks the terminal during its transaction. A new local payment is `ACCEPTED`;
the same terminal/local ID and content yields `DUPLICATE`; changed payment content yields
`CONFLICT`. An identical batch retry replays original ordered results; the same batch ID
with changed content returns HTTP 409. Invalid requests return HTTP 400 atomically, without
creating a batch (`INVALID` remains a reserved result enum). Disabled terminals reject new
batches with 409 but allow completed-batch replay. Cross-account resources return 404.

The client validates the response batch ID, ordered result IDs, result count, and allowed
statuses before atomically completing the local batch. Network errors, 401, 500, malformed
responses, storage errors, and reloads preserve a retryable batch. Missing local records
inside an interrupted batch produce an explicit review error, never a silently shortened request.

`CONFLICT` and `INVALID` records are retained for review, not automatically rewritten or
retried. There is no conflict-edit API or conflict resolution workflow in this version.

Queues are filtered by JWT subject. Logout clears session credentials and server caches but
retains IndexedDB. Another account sees its own queue; signing back in restores the original
view. This is application isolation, not encryption against someone with access to the same
browser profile or developer tools. Browser eviction, profile deletion, private browsing,
or changing the frontend origin can make local data unavailable. Back up operational data
and do not clear browser storage before synchronizing.

The loaded app can record payments while the API is unavailable. Refresh recovery requires
the frontend assets to remain reachable: there is no service worker or guaranteed offline
cold start. Terminal metadata is server/query-cache data and may be unavailable after an
API-offline refresh; existing local records remain accessible.
