# GhostPay architecture

GhostPay has three runtime services:

- React/Vite serves the workspace UI and uses TanStack Query for server state.
- Spring Boot exposes authenticated merchant, terminal, payment, and sync APIs.
- PostgreSQL stores users, merchants, terminals, payments, and synchronization
  batches. Flyway applies schema migrations before Hibernate validation.

The browser stores locally recorded payments and batches in IndexedDB. The
backend is authoritative after synchronization; the browser remains usable
while it is offline.

The backend follows feature modules (identity, merchant, terminal, payment, sync), with
controllers/DTOs, application services, domain entities and JPA repositories. Shared JWT,
security and exception handling apply consistently across modules. No architecture rewrite
was needed for the release audit.

The nginx production frontend proxies `/api` to Spring Boot; local Vite proxies to port
8080. The application uses sessionStorage JWTs and clears server query caches on session
changes. Local queues are account-scoped IndexedDB records with atomic batch claims,
ordered retries, and cross-tab coordination. PostgreSQL locking/uniqueness constraints
provide the authoritative concurrency boundary. See [offline-sync.md](offline-sync.md).

Offline means API-unavailable recording in a loaded frontend. There is no service-worker
asset cache or offline cold-start guarantee. Auto synchronization, conflict editing,
profile editing and terminal status editing are not implemented. Display-only statistics
and unused legacy presentation components are not evidence of backend functionality.
