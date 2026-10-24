# GhostPay

An offline payment synchronization and conflict resolution simulator. Record simulated
payments locally, keep them through an API outage, and synchronize them with PostgreSQL
using stable batch IDs, ordered results, and duplicate/conflict detection.

GhostPay uses Java 21 / Spring Boot, PostgreSQL 17 / Flyway, React / TypeScript / Vite,
and IndexedDB / Dexie. It does not process real card or banking transactions.

## Choose how to run it

| Your goal | Recommended setup | Open |
| --- | --- | --- |
| Try the app or give a demonstration | PostgreSQL, API and built frontend in Docker Compose | <http://localhost:3000> |
| Work on the frontend | Compose database/API + local Vite with hot reload | <http://localhost:5173> |
| Work on the backend or both sides | Compose database + local Spring Boot + local Vite | <http://localhost:5173> |
| Run browser integration tests | A separate Compose project and database volume | See [testing](#4-run-tests) |
| Host it publicly | Built containers behind an HTTPS reverse proxy, with deployment hardening | See [public-deployment](#5-public-deployment) |

Run the commands below from the repository root unless a block says otherwise. They use
a POSIX-compatible shell, such as Bash or Zsh; on Windows, use WSL2 or adapt the commands.
Keep the same Compose project name and environment file when operating an existing stack.

## First-time configuration

For the all-Docker setup, install Docker Engine/Desktop with Compose support. Java, Node
and Gradle do not need to be installed on the host: the images build the application.
Docker must be running before you start.

Create the root environment file without overwriting an existing one:

```sh
test -f .env || cp .env.example .env
chmod 600 .env
```

For a **new installation**, run this command twice and paste the two different outputs
into `.env` as `DATABASE_PASSWORD` and `JWT_SECRET`:

```sh
openssl rand -hex 32
```

The root `.env` needs these two values:

```dotenv
DATABASE_PASSWORD=<first-generated-value>
JWT_SECRET=<second-generated-value>
```

Replace the placeholders. Never commit real secrets. The JWT secret must contain at least
32 UTF-8 bytes. `FRONTEND_ORIGINS` can optionally override the frontend origin allowlist;
the default Compose setup permits localhost and 127.0.0.1 on port 3000.

**For an existing database volume, keep its actual password.** Changing `.env` does not
rotate the PostgreSQL role's stored password. Do not regenerate secrets whenever you start
the app, and do not delete a volume to fix authentication. See [credential recovery](docs/docker.md#existing-postgresql-credentials).

## 1. Try the app or run a demonstration

Use the complete Docker stack. This is the simplest setup for using GhostPay without
editing its source code.

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Wait for `Started GhostPayApplication` in the backend logs. Press `Ctrl+C` to stop following
the logs; the containers keep running. Database migrations run automatically before
Hibernate validates the schema.

Open <http://localhost:3000>, then:

1. Create an account and sign in. There is no seeded login to use.
2. Add a merchant, then create a terminal for that merchant.
3. Open the virtual terminal, enter an amount with the keypad, and add a purchase reference.
4. Record the payment. It is saved to this browser's IndexedDB first.
5. Use **Sync now** to send it to the backend, then inspect **Payments** or **Synchronization**.

The frontend is also accessible at <http://127.0.0.1:3000>. Choose one hostname and keep
using it: browser storage is separate for each origin.

### Start, stop and update

```sh
# Start an already-created stack:
docker compose up -d

# Rebuild after changing application code or dependencies:
docker compose up --build -d

# Show service status or recent logs:
docker compose ps
docker compose logs --tail=100 backend frontend

# Stop and remove containers/networks, retaining PostgreSQL data:
docker compose down
```

Use `docker compose up -d` after changing environment variables so affected services are
recreated. `docker compose restart` restarts existing containers with their existing
configuration. Avoid `docker compose down -v`: it deletes the database volume.

### Demonstrate an API outage

Create and open a terminal while the API is available. Leave the frontend container running:

```sh
docker compose stop backend
```

Record several payments and refresh the page. The local queue should remain present,
although server-provided terminal details may be unavailable. Restore the API:

```sh
docker compose start backend
docker compose logs -f backend
```

Once startup completes, use **Sync now**. The queue should receive ACCEPTED results and the
server-side Payments view should show the records. Automated tests additionally verify
identical batch replay and the absence of duplicate records.

Offline support here means **recording while the API is unavailable**. There is no service
worker, so a fresh page load still needs reachable frontend assets. Sync is manual and
processes at most 100 queued payments per terminal per click. Keep the browser profile and
origin holding unsynchronized payments; clearing storage can remove them. Logout retains
the local queue and filters its view by account.

## 2. Develop the frontend

Use Docker for PostgreSQL and Spring Boot, and Vite for fast frontend updates. Install
Node.js 22.12+ on the Node 22 release line, or a compatible newer release, plus npm.
The container build uses Node 22.

From the repository root, after configuring `.env`:

```sh
docker compose up --build -d db backend
```

Wait for the API to start, then run Vite in a separate terminal:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` requests to `http://localhost:8080`, so
no `VITE_API_BASE_URL` is needed for this setup. Save frontend files to see changes without
rebuilding Docker images. Run `npm ci` again when the lockfile changes.

The nginx frontend on port 3000 can remain running, but it serves the last Docker build
and does not hot reload. Ports 3000 and 5173 have separate IndexedDB queues and sessions;
synchronize pending payments before switching between them.

Stop Vite with `Ctrl+C`. Stop its Compose services with `docker compose down` when finished.

## 3. Develop the backend or the full application

Run Spring Boot locally to use IDE debugging and local builds, while PostgreSQL stays in
Docker. Install **Java 21**; the repository includes the Gradle wrapper, so a separate
Gradle installation is unnecessary. Install Node/npm too if you will run the UI.

If the normal Compose backend/frontend are running, stop those services first so local
Spring Boot can use port 8080:

```sh
docker compose stop backend frontend
```

Start only PostgreSQL with the optional development override:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

The override exposes PostgreSQL only on `127.0.0.1:15432`, avoiding the usual host port
5432. It retains the same database volume for this Compose project. The default all-Docker
setup does not publish a PostgreSQL port.

Create the backend's separate configuration file without overwriting an existing one:

```sh
test -f backend/.env || cp backend/.env.example backend/.env
chmod 600 backend/.env
```

Edit `backend/.env` to select this dedicated GhostPay database:

```dotenv
DATABASE_URL=jdbc:postgresql://localhost:15432/ghostpay
DATABASE_USERNAME=ghostpay
DATABASE_PASSWORD=<same-value-as-root-.env>
JWT_SECRET=<your-generated-JWT-secret>
```

Use the actual database password from the root `.env`. You may reuse that file's JWT
secret for local development. Do not leave an old datasource URL pointing to another
project's database. Spring loads `backend/.env` when launched **from `backend/`**;
the root Compose `.env` is not automatically loaded by local Spring Boot. Exported shell
environment variables override the file, so check them if the selected datasource seems wrong.

Start the API in one terminal:

```sh
cd backend
./gradlew bootRun
```

Wait for startup, then start the UI in a second terminal:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://127.0.0.1:5173>. Local Java compilation/debugging is handled by your IDE or
Gradle; unlike Vite, `bootRun` does not provide automatic source hot reload in this project.
Restart it after backend changes. PostgreSQL is also available to local SQL tools at
`localhost:15432`, database/user `ghostpay`.

To stop, use `Ctrl+C` in both local processes, then:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

The volume is retained. To return to the complete container setup, run
`docker compose up --build -d` without the development override.

## 4. Run tests

### Backend tests and build

Only Java 21 and a working Docker daemon are needed. No running GhostPay stack or local
`.env` is required: Testcontainers starts disposable PostgreSQL and applies migrations.

```sh
cd backend
./gradlew clean test build --console=plain
```

### Frontend checks

These checks do not require a running API:

```sh
cd frontend
npm ci
npm run lint
npm run build
npm test
npm run format:check
```

`npm run build` includes TypeScript checks and produces `frontend/dist`. It does not start
a server. The Docker frontend serves that production build through nginx.

### Browser tests against an isolated stack

Browser tests create accounts, merchants, terminals and payments. Use a separate Compose
project and volume. Its default host ports are still 3000 and 8080, so stop your normal
stack first if it is using those ports. Do not stop an unrelated application's containers.

From the repository root, using the configured root `.env`:

```sh
docker compose --env-file .env -p ghostpay-e2e up --build -d
docker compose --env-file .env -p ghostpay-e2e logs -f backend
```

After API startup, stop following logs with `Ctrl+C`, then:

```sh
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e -- --list
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

The configured suite uses Chromium and the real API/database. Without `E2E_BASE_URL`,
`npm run test:e2e` starts Vite on port 5173 and expects the API on port 8080. CORS checks
call port 8080 directly; set `E2E_API_BASE_URL` if your isolated API uses another address.
Keep ports 5173 and 8080 available for the default Vite-backed test mode.

Stop the isolated stack from the repository root, preserving its test data:

```sh
docker compose --env-file .env -p ghostpay-e2e down
```

Use the same environment file for subsequent runs against that volume. For the physical
backend-stop test and supplementary HTTP/restart/security scripts, follow the fixed
`ghostpay-release-audit` project setup in [testing instructions](docs/testing.md).
Test reports, trace locations and the executed release results are documented there and
in [release readiness](docs/RELEASE-READINESS.md).

## 5. Public deployment

Use the built Docker frontend and backend behind an HTTPS reverse proxy. Do not expose
Vite as the public application server. The default Compose ports bind to loopback; keep
the database internal, omit the development override, and configure:

- Independent random secrets and durable PostgreSQL storage with backups.
- A domain and TLS termination, plus `FRONTEND_ORIGINS=https://your-domain.example`.
- Monitoring, request/rate limits, secret management, and a container image vulnerability scan.

A concrete Caddy TLS example is in [Docker operations](docs/docker.md#public-tls-configuration).
The local release audit did not provision public DNS/TLS or certify public deployment;
review [security](docs/security.md) and the release limitations before exposing the app.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Compose says a secret is missing | Configure the root `.env`, or supply the intended `--env-file`. |
| Database authentication fails after changing `.env` | Restore the existing volume's actual password. Environment changes do not rotate stored PostgreSQL credentials. |
| Port 3000, 5173, 8080 or 15432 is already in use | Inspect your local processes and `docker ps`; stop only the stack you intend to replace. A second project name does not avoid host-port conflicts. |
| Frontend returns 502 or cannot reach the API | Check `docker compose ps` and backend logs, and wait for Spring Boot to finish starting. For Vite, verify the API is listening on port 8080. |
| Local Spring Boot cannot connect to PostgreSQL | Use the development override and `localhost:15432`; check `backend/.env` and exported environment variables. |
| Browser login returns 403 | Use a configured frontend origin. For direct API deployments, set the exact origin in `FRONTEND_ORIGINS` and recreate the backend. |
| Docker frontend does not show source changes | Rebuild it, or use Vite on port 5173 for frontend development. |
| Offline queue looks empty after changing URL or browser | Return to the original scheme/hostname/port and browser profile, then sign in to the original account. |
| Flyway reports a checksum mismatch | Compare the applied schema and migration history; follow the backend documentation. Never disable validation or delete volumes as a workaround. |

## Project documentation

- [Release readiness and executed test results](docs/RELEASE-READINESS.md)
- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Database](docs/database.md)
- [Offline synchronization](docs/offline-sync.md)
- [Docker operations and credential recovery](docs/docker.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Backend development](backend/README.md)
- [Frontend development](frontend/README.md)
- [Why I used AI](docs/why-i-used-ai.md)
