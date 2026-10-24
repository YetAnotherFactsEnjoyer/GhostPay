# GhostPay frontend

## Development

For the recommended Docker API + local Vite setup, follow
[frontend development in the main README](../README.md#2-develop-the-frontend).
The commands below expect the backend to be available on port 8080.

```sh
npm ci
npm run dev
```

## Docker

From the repository root, start PostgreSQL, the Spring Boot backend, and the
production frontend with:

```sh
docker compose up --build
```

Open <http://localhost:3000>. The frontend container serves the built React
application and proxies `/api` requests to the backend container. PostgreSQL
data is persisted in the `ghostpay-postgres` Docker volume.

Before starting Compose, set `DATABASE_PASSWORD` and
`JWT_SECRET` in a root `.env` file. `JWT_SECRET` must
contain at least 32 UTF-8 bytes.

Development requests use the Vite `/api` proxy to `http://localhost:8080`, so
the browser does not need backend CORS configuration. Set `VITE_API_BASE_URL`
for a deployed frontend that should call an API directly. In that case, the
backend must allow the frontend origin through `FRONTEND_ORIGINS`.

## Backend contract used

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/account/me`
- `GET|POST /api/v1/merchants`
- `GET|POST /api/v1/terminals` (`GET` requires `merchantId`)
- `GET /api/v1/payments` (`terminalId` required)
- `POST /api/v1/terminals/{terminalId}/sync`

The backend currently has no merchant/terminal update or delete endpoints, no profile editing endpoint, and no payment creation endpoint other than synchronization. Display-only details are not editable; automatic synchronization and mobile-network policy controls are disabled. Conflict resolution is manual review only.

## Architecture

The application is organized by responsibility:

- `src/app` contains providers, layouts, protected routing, and route composition.
- `src/features` contains page-level feature modules and their focused components/hooks.
- `src/shared/components` contains the reusable UI and navigation primitives.
- `src/features/sync/storage.ts` and `src/features/sync/service.ts` remain the single source of truth for the offline queue and idempotent synchronization behavior.

Useful commands:

```sh
npm run lint
npm run build
npm test
```

## Light green UI and browser verification

The redesign, shared token system, page changes, and verification limits are documented in [REDESIGN.md](REDESIGN.md).

```sh
npm run format:check
npx playwright install chromium
npm run test:e2e
```

The browser suite starts Vite automatically and requires a real backend on port 8080.
It creates unique accounts and records; always use an isolated database. Set
`E2E_BASE_URL=http://127.0.0.1:3000` to test the built Compose frontend instead.
See [testing](../docs/testing.md) for actual scenario coverage and outage controls.
Only Chromium and the documented viewport checks have been executed; this is not
cross-browser certification.
