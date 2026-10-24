# GhostPay

Offline payment synchronization and conflict resolution simulator. Java 21 / Spring Boot,
PostgreSQL 17, React / TypeScript, and IndexedDB. This simulates payments; it does not
process card or banking transactions.

## Run with Docker

Requires Docker Engine and Compose. From the repository root:

```sh
cp .env.example .env
chmod 600 .env
# Replace both example values with independent random secrets (openssl rand -hex 32).
docker compose up --build -d
docker compose ps
docker compose logs backend
```

Open <http://localhost:3000> or <http://127.0.0.1:3000>. Register, log in, create a merchant
and terminal, then open the terminal to record payments. Use Sync now to send the local
queue to PostgreSQL. `docker compose down` stops the stack and retains its database volume.
Never use `down -v` to repair authentication or migration errors.

`DATABASE_PASSWORD` and `JWT_SECRET` are required; JWT secrets need at least 32 UTF-8 bytes.
Use real random values, not the placeholders. `FRONTEND_ORIGINS` optionally overrides the
comma-separated origin allowlist. Frontend and backend ports bind to loopback; PostgreSQL
has no published host port. See [Docker operations](docs/docker.md) for existing-volume
credentials, isolated audits, restarts, and a public TLS deployment example.

## Local development and checks

Requires Java 21, Node 22.12+ (Node 22 recommended), npm, and Docker for integration tests.
Use the Compose backend/database while running Vite, or configure a separate PostgreSQL
instance as described in [backend/README.md](backend/README.md).

```sh
cd backend
./gradlew clean test build --console=plain
cd ../frontend
npm ci
npm run lint
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright starts Vite on port 5173 and expects the real backend on port 8080. It creates
unique test accounts and records. Run it against an isolated database, as described in
[testing](docs/testing.md). No tests fall back to an existing development database.

IndexedDB persists payments across browser refresh when the frontend remains reachable.
The frontend has no service worker; a full network outage prevents a fresh page load.
Sync is manual. Keep the browser profile and origin that hold unsynchronized payments.

- [Release readiness](docs/RELEASE-READINESS.md)
- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Database](docs/database.md)
- [Offline sync](docs/offline-sync.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
