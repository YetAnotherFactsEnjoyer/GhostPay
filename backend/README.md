# GhostPay backend

Requires Java 21 and PostgreSQL 17. For the recommended local API + Docker database setup,
see [backend development in the main README](../README.md#3-develop-the-backend-or-the-full-application).
Run `./gradlew bootRun` from this directory after configuring its datasource.
Spring loads the optional, git-ignored `.env` file here; environment variables
override its values. Use this directory's `.env.example` as a reference when setting up another machine
and supply the existing database credentials and a random JWT secret of at least
32 bytes. Keep `.env` private (`chmod 600 .env`).

The datasource accepts `DATABASE_URL` (a JDBC URL), `DATABASE_USERNAME`, and
`DATABASE_PASSWORD`. The password and `JWT_SECRET` are required. The root
`docker-compose.yml` supplies a dedicated PostgreSQL service and persistent volume.
For local `bootRun`, create a private `backend/.env` containing those four variables
(and optionally `FRONTEND_ORIGINS`). Do not point integration tests at this database.
Changing Compose's `POSTGRES_*` values does not rotate credentials in an initialized
volume. See [Docker operations](../docs/docker.md) for safe credential recovery.

Flyway applies migrations before Hibernate validates the schema. User IDs use
PostgreSQL `UUID` and Java `UUID` throughout the entity and repository.
V2 converts existing numeric user IDs to newly generated UUIDs while retaining
the other user fields. Hibernate generates UUIDs for new entities; PostgreSQL
also provides a UUID default for direct SQL inserts.
Add a new versioned migration for future schema changes; keep applied migrations
unchanged.

If an applied migration was edited and startup reports a checksum mismatch,
first compare the actual database schema with the SQL. Only when they match,
export `DATABASE_URL`, `DATABASE_USERNAME`, and `DATABASE_PASSWORD`, then run
`./gradlew flywayRepair` against that database and restart. The standalone repair
utility does not load Spring `.env` configuration and has no datasource/secret defaults. Repair updates
migration history; it does not apply schema changes. Never disable validation or
delete database volumes to work around the mismatch.

## Tests and build

Run from `backend`:

```sh
./gradlew test --console=plain
./gradlew build --console=plain
```

Integration tests require a working Docker daemon. Testcontainers starts a disposable
PostgreSQL 17 container, applies all Flyway migrations, and overrides the datasource
credentials and JWT configuration. Tests never use the development datasource or
load the local `.env` file. No opt-in environment flag is needed; missing Docker
fails the tests rather than silently skipping them. Testcontainers removes its
containers when the test JVM exits.

Payments are ingested through `POST /api/v1/terminals/{terminalId}/sync` and read
through `GET /api/v1/payments?terminalId=...`. Tests cover payment validation,
ownership, idempotency, conflict detection, replay after disabling a terminal,
request ordering, database constraints, rollback, concurrency, and real JWT validation.

## Security configuration

Only registration and login are public. Protected endpoints use stateless HS256
JWT authentication with issuer, timestamp, expiration-presence, and UUID-subject
validation. Responses never include password hashes. BCrypt passwords may contain
at most 72 UTF-8 bytes; oversized registration passwords return HTTP 400.

Set `FRONTEND_ORIGINS` to a comma-separated list of trusted, exact frontend origins
(for example `https://pay.example.com,http://localhost:5173`). Cross-origin API
access is denied by default. Allowed requests use the Authorization header;
cookie credentials are not enabled.

Errors use the shared `ApiError` structure. Missing or unowned resources return
404, conflicting batches and new syncs on disabled terminals return 409, and
unexpected failures return a generic 500 response. Completed batches remain
replayable after disabling their terminal.
