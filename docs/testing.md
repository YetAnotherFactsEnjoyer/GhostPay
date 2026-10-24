# Repeating the release verification

Use Java 21, Node 22.12+ (22 recommended), npm, Docker Engine/Compose and Playwright
Chromium. Integration tests require Docker and fail if it is unavailable.

## Backend

```sh
cd backend
./gradlew clean test build --console=plain
```

38 JUnit tests run, including full Spring/MockMvc HTTP handling with real security and
Testcontainers PostgreSQL 17. A fresh container applies all migrations; no developer
`.env` or database is used. Tests cover BCrypt/JWT, ownership, validation, constraints,
disabled terminals, ordered replay, changed batches, rollback via a PostgreSQL trigger,
and concurrent identical/different batches. MockMvc exercises the servlet stack, not a
listening TCP socket; Playwright's API requests additionally verify actual HTTP over nginx.
Results: `backend/build/test-results/test` and `backend/build/reports/tests/test`.

## Frontend

```sh
cd frontend
npm ci
npm run lint
npm run build
npm test
npm run format:check
npm audit
npx playwright install chromium
npm run test:e2e -- --list
```

Vitest includes `src/**/*.test.{ts,tsx}` only. Tests use fake-indexeddb for durable
queue logic, React Testing Library for payment-entry validation, and the existing chart/
format tests. Playwright discovers `e2e/**/*.spec.ts`; it is a separate browser suite.
TypeScript runs as part of production build.

## Browser integration against isolated Compose

Create `/tmp/ghostpay-release-audit.env` with independent random `DATABASE_PASSWORD`
and `JWT_SECRET` values and restrict it to mode 600. Use a fresh project name:

```sh
# repository root
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit up --build -d
# wait for backend logs to show Started GhostPayApplication
cd frontend
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

To execute the physical backend outage scenario against this exact audit project:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 E2E_BACKEND_CONTAINER=ghostpay-release-audit-backend-1 npm run test:e2e
```

Only that explicit audit container name is accepted. One test stops and restarts it in
a try/finally block. Never set this variable for a shared deployment. Without the variable,
the same test disconnects API transport at the browser only. Other fault-injection tests
simulate a lost response or invalid server response and label that behavior explicitly;
the normal synchronization requests reach the real API/database.

For the original `npm run test:e2e` command, omit `E2E_BASE_URL`: Playwright starts Vite
on 127.0.0.1:5173 and proxies `/api` to localhost:8080. The backend must still use an
isolated database. CORS rejection checks call `E2E_API_BASE_URL` (default `http://127.0.0.1:8080`)
directly because the development proxy strips Origin headers. No backend is started
automatically by Playwright, and there is no
mock-only fallback. Keep workers at one because the physical outage affects the stack.
Unique test accounts avoid fixtures colliding across runs; browser contexts isolate local
storage while two-tab tests deliberately share it. Tests add data and never truncate it.

JSON results are written to `frontend/test-results/results.json`. Failure traces are
retained. The viewport check covers 1440, 768 and 390 pixels and captures mobile Overview/terminal
screenshots. No Firefox/WebKit coverage is claimed.

## Dependency audit

```sh
cd backend
./gradlew exportRuntimeDependencies
cd ..
python3 scripts/audit-runtime-dependencies.py
cd frontend
npm audit
npm audit --omit=dev
```

Network/Docker/browser failures are blockers, not successful or skipped verification.
See [release readiness](RELEASE-READINESS.md) for the exact final executed counts and limits.

Supplementary HTTP and restart checks use only the fixed `ghostpay-release-audit` project
and `/tmp/ghostpay-release-audit.env` created above:

```sh
python3 scripts/check-release-http.py
# Stop browser tests before restarting services:
python3 scripts/check-release-restart.py
```

The HTTP check creates a new fixture, disables only its terminal in the audit database,
verifies HTTP 409 without writes, and signs an expired test JWT to verify HTTP 401. The
restart check compares all six application table counts before/after and verifies a real
HTTP login through nginx. Both write small evidence files under `/tmp`; no tokens/secrets
are printed. The scripts deliberately use the fixed audit project so they cannot silently
select a developer/production Compose project.
