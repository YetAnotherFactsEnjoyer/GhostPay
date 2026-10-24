# GhostPay release readiness

Audit date: 2026-10-23. Scope: the existing payment simulator and its documented local
Docker deployment. Existing working-tree changes were preserved; no commit was created,
no existing development database was used for destructive tests, and no volume was deleted.

## A. Release verdict

**READY WITH LIMITATIONS**

The critical payment simulation path, authentication/ownership boundaries, durable offline
queue, ordered retries, idempotency, rollback, concurrency, and Docker deployment have
passed executed checks. Verified defects were corrected and retested. The approved visual
layout and feature-based architecture remain intact.

This verdict applies to the documented simulator: manual synchronization in a loaded
frontend, including API outages. It does not certify an internet-facing deployment,
unlimited production throughput, real payment processing, or offline cold starts. The
noncritical limitations and unverified optional environments are listed below.

## B. Test results

Final results after relevant fixes; intermediate failures are described separately.
Counts are test cases unless the row explicitly says checks or migrations.

| Category | Number | Passed | Failed | Skipped | Execution status | Notes |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Backend JUnit | 38 | 38 | 0 | 0 | PASSED | `./gradlew clean test build`; 30 PostgreSQL/Spring integration cases and 8 unit cases |
| Frontend Vitest / RTL | 12 | 12 | 0 | 0 | PASSED | 8 durable queue cases, payment-entry component validation, 3 existing chart/format cases |
| Playwright, production Compose frontend | 15 | 15 | 0 | 0 | PASSED | Chromium; actual nginx/API/PostgreSQL; physical audit-backend stop/start included |
| Playwright, original Vite command | 15 | 15 | 0 | 0 | PASSED | `npm run test:e2e`; Vite started by Playwright; same suite, not 15 additional unique scenarios |
| Supplementary real HTTP checks | 2 | 2 | 0 | 0 | PASSED | Disabled terminal: 409, zero payment writes; correctly signed expired JWT: 401 |
| Full-stack restart / persistence check | 1 | 1 | 0 | 0 | PASSED | Login through nginx recovered; all six table counts unchanged |
| Flyway applications | 6 | 6 | 0 | 0 | PASSED | V1–V6 on fresh PostgreSQL; subsequent restart validates without reapplying |
| Dependency advisory checks | 3 | 3 | 0 | 0 | PASSED | npm all / production: zero advisories; OSV: zero matches across 105 resolved Maven runtime coordinates |
| Repair fail-closed check | 1 | 1 | 0 | 0 | PASSED | Missing datasource environment causes expected failure before database access |
| npm ci, TypeScript, ESLint, build, formatting | — | — | — | — | PASSED | TypeScript runs inside `npm run build`; no ESLint warnings/errors |
| Container OS-package vulnerability scan | — | — | — | — | NOT VERIFIED | npm/OSV checks do not scan base-image OS packages |
| Firefox, WebKit, physical mobile devices | — | — | — | — | NOT VERIFIED | Chromium viewports are not cross-browser/device certification |
| Public DNS / TLS deployment | — | — | — | — | NOT PROVISIONED | Local HTTP verified; concrete TLS reverse-proxy instructions documented |

There are 65 unique automated JUnit/Vitest/Playwright cases. The Vite and production
Playwright rows execute the same 15 scenarios in two deployment modes. No test cases
were silently skipped or deleted to achieve green results.

### Baseline and failures found

- Baseline backend: 38 tests passed against disposable PostgreSQL.
- Baseline frontend: installation, lint, TypeScript/build and 3 unit tests passed.
- `npm run test:e2e -- --list` reproduced **No tests found**, with zero files. The
  configured `frontend/e2e` directory was missing; npm script and testDir were correct.
- Baseline npm audit: 11 findings (8 moderate, 1 high, 2 critical).
- The restored production browser suite initially had 9 failures caused by the real
  127.0.0.1 CORS mismatch. Actual API calls without browser Origin could succeed while
  browser login failed with 403. Fixing the allowlist restored browser access.
- Browser testing caught a session-cache implementation regression during this audit:
  remounting the router on token changes could lose login navigation. The final provider
  clears caches synchronously without remounting routing; mobile login is now covered.
- Test-selector ambiguity was corrected by scoping accessible links/buttons. The Vite
  outage interceptor was narrowed to `/api/v1/` so it cannot block source-module imports.
  CORS rejection is checked directly against the backend because Vite strips Origin.
- A full-stack restart reproduced nginx exiting with `host not found in upstream
  "backend"`. Runtime Docker DNS resolution fixed this, followed by a successful restart.

### What the tests actually establish

Browser cases cover registration/login, validation, merchant/terminal creation,
all nine requested pages, logout/protected navigation, refresh, empty/loading/error
states, API errors, account switching, selected sync, two tabs, and retained IndexedDB.
All application pages fit 1440px, 768px and 390px viewports without document overflow;
mobile navigation and keyboard focus/Escape are exercised. Mobile Overview and virtual
terminal screenshots were inspected. This is targeted accessibility verification, not
a full WCAG audit or pixel-perfect visual regression certification.

The outage case physically stops only `ghostpay-release-audit-backend-1`, records two
payments, checks IndexedDB, reloads with frontend assets available, attempts a failed sync,
restarts the backend, retries the persisted batch ID/order, verifies ACCEPTED results,
replays the exact HTTP batch, and verifies the payment list remains at two records.
Other fault tests explicitly inject 500/401/malformed responses or lose a real committed
response. A separate case refreshes the browser while a committed response is in flight.
These faults retain recoverable local batches; normal/replay requests use the real API.

Backend tests use the full Spring servlet/security stack with PostgreSQL, not mocked
repositories. They verify same-batch replay, DUPLICATE/CONFLICT, changed/reordered batch
409s, request validation, disabled terminals, ownership, invalid/expired JWTs, configured
and disallowed CORS, database uniqueness, and concurrency. A PostgreSQL trigger fails the
second payment insert and proves payment/batch/event rollback. MockMvc is not a TCP
server; Playwright and the supplementary smoke script provide real HTTP coverage.

## C. Security findings

| Vulnerability / concern | Severity | Area / reachability | Fix applied | Remaining risk |
| --- | --- | --- | --- | --- |
| Vitest UI execution, tinypool prototype-pollution gadgets, mocker/nested Vite advisories | Critical / high / moderate | Development/test dependencies; not shipped as nginx runtime code | Targeted Vitest 4.1.12 upgrade removes the vulnerable dependency chain | Do not expose test/dev servers; advisories are point-in-time |
| React Router redirect / SSR hydration advisories | Moderate | Runtime router; GhostPay uses fixed local destinations and no SSR hydration | Upgrade react-router-dom to 7.18.4; browser navigation retested | Same-origin script security still matters |
| Tailwind transitive PostCSS selector parser complexity | Moderate | Build tooling parsing CSS | Targeted parser override to 7.1.6; retain Tailwind 3; build/UI retested | Reassess override when upgrading Tailwind |
| Jackson core/databind advisories | High / moderate | Runtime JSON parsing; exploit paths depend on input type/configuration | Jackson BOM 3.1.7 replaces 3.1.5; all backend tests pass | OSV is not an exhaustive parser security proof |
| Tomcat authenticator advisories | Critical / high | Tomcat 11.0.24; affected FORM/DIGEST authentication is not configured by this JWT application | Patch all managed Tomcat modules to 11.0.25 | Container OS packages separately unscanned |
| Manual Flyway repair had a hardcoded password and defaulted to an unrelated datasource | High operational risk | Explicit maintenance command could modify the wrong migration history | Require all datasource variables; verified missing configuration fails before connecting | Operator must still compare schema/history and deliberately select the database |
| Session changes could retain old TanStack Query data | Medium confidentiality risk | Account switching / expired sessions | Clear/cancel caches on auth changes; reactive protected routing; ignore stale-session 401s | sessionStorage remains readable by same-origin JavaScript |
| Synchronization accepted unvalidated/incomplete success responses | High reliability risk | Queue could be marked complete with missing results | Validate batch ID, ordered IDs, count and status before committing local completion | Browser storage eviction/profile deletion is outside application guarantees |
| Secret handling / local HTTP | Deployment-dependent | Required environment values; loopback binding | Root git ignore and build-context ignores; no repair fallback secret; TLS guide | No entropy enforcement, secret rotation service, public rate limiting or certificate provisioning |

The initial OSV scan reported 10 advisory matches across three vulnerable runtime
coordinates: Jackson core/databind and Tomcat embed core. The final scan reports zero.
See [security documentation](security.md) for advisory links, reachability qualifications,
JWT/storage tradeoffs and reproducible scanner commands. Zero scan findings is not a
claim that no unknown vulnerabilities exist.

Source review confirmed BCrypt hashing, required JWT secret/issuer/expiration/UUID subject
validation, ownership-scoped repositories, bound JPA query parameters, and sanitized API
errors. No frontend raw-HTML injection sink was found. This is code review plus targeted
security testing, not an external penetration-test certification.

## D. Bugs fixed

The repository already contained substantial uncommitted implementation/test work before
this audit. The following describes changes made by this audit, not authorship of the
preexisting backend security suite or payment modules.

| Changed files | Correction |
| --- | --- |
| `frontend/e2e/release.spec.ts`, `frontend/playwright.config.ts` | Restore discoverable, real integration/browser tests; configurable production base URL, single-worker outage tests, JSON results and failure traces |
| `frontend/src/features/sync/service.ts` | Preserve stored request order on retries; atomically claim batches; coordinate tabs; send only selected IDs; scope writes by account/terminal/primary ID; retain queues on invalid responses/storage failures |
| `frontend/src/features/sync/storage.ts` | Remove obsolete broad interrupted-state reset; preserve durable batches for retry |
| `frontend/src/features/sync/pages/SyncPage.tsx` | Wire Sync selected, scope Sync now to its terminal, implement queue sort, clear completed selection; disable unsupported auto/mobile sync and conflict-edit controls |
| `frontend/src/shared/api/client.ts`, `frontend/src/app/providers/QueryProvider.tsx`, `frontend/src/app/router/ProtectedRoute.tsx` | Reactive auth state, cache clearing without router remount, current-session-only 401 clearing, avoid retrying deterministic 4xx query errors |
| `frontend/src/features/terminals/pages/VirtualTerminalPage.tsx` | Show actual result statuses instead of labeling every nonpending result Accepted; disable unsupported edit/more actions |
| `frontend/src/features/payments/pages/PaymentsPage.tsx` | Disable unsupported export/refund/pagination controls; correct unfiltered range label to All time |
| `frontend/src/features/auth/components/AuthForm.tsx` | Align password help with BCrypt's UTF-8 byte limit |
| `frontend/src/features/sync/service.test.ts`, `frontend/src/features/terminals/components/PaymentEntry.test.tsx` | Durable retry, selection, account separation, response validation, storage failures, batch limit and submission validation regressions |
| `frontend/package.json`, `frontend/package-lock.json` | Targeted patched dependencies; fake-indexeddb for meaningful storage tests |
| `backend/build.gradle` | Compatible Jackson/Tomcat security patches; reproducible resolved-runtime coordinate export |
| `backend/src/main/java/com/ghostpay/maintenance/FlywayRepair.java` | Remove hardcoded/default datasource credentials; fail closed |
| `docker-compose.yml` | Allow both documented local frontend origins, with explicit deployment override |
| `frontend/nginx.conf` | Runtime backend DNS resolution; survive full-stack restart and backend name unavailability |
| `.gitignore`, `frontend/.dockerignore`, `backend/.dockerignore` | Keep secrets and generated/local artifacts out of git and actual Docker build contexts |
| `scripts/audit-runtime-dependencies.py`, `scripts/check-release-http.py`, `scripts/check-release-restart.py` | Repeatable advisory, actual HTTP and restart/persistence checks; supplementary destructive fixture changes restricted to fixed audit project |
| `README.md`, `backend/README.md`, `frontend/README.md`, `docs/*.md` | Accurate setup/API/schema/offline/security/testing/TLS/release documentation; historical implementation notes marked as such |

No applied migrations were edited. No architectural rewrite, new payment feature,
security bypass, forced npm audit fix, database reset, or UI redesign was introduced.

## E. Deployment verification

Executed `docker compose --env-file /tmp/ghostpay-release-audit.env -p
 ghostpay-release-audit up --build -d` with generated secrets and a new
`ghostpay-release-audit_ghostpay-postgres` volume. Existing volumes were retained untouched.

Verified PostgreSQL 17.11 authentication over TCP, Flyway V1–V6, Hibernate schema validation,
Spring Boot startup, nginx static assets, browser-to-nginx-to-API connectivity, registration,
login, protected requests and payment persistence. Inspected deployed backend JAR contents:
Jackson core/databind 3.1.7 and Tomcat embed core 11.0.25 were present.

PostgreSQL inspection found all six successful migrations and zero duplicate
`(terminal_id, local_payment_id)` groups. Backend tests separately assert exact payment,
batch and event counts during replay/concurrency, not merely successful HTTP statuses.

After the nginx fix, full-stack restart preserved counts exactly:
`users=153, merchants=128, terminals=127, payments=76, batches=79, events=96`.
A real login through nginx returned 200 after recovery. These are the final restart
snapshot counts; fixtures accumulate across audit runs and are not expected fresh-install
counts. Final service inspection showed all three containers running, PostgreSQL healthy,
and zero duplicate payment keys. The audit stack remains running at localhost:3000.

The original host-port-5432 PostgreSQL credential problem was not repaired by altering or
resetting unrelated data. The isolated GhostPay stack uses its own internal database.
Safe recovery/rotation instructions for existing volumes are in [docker.md](docker.md).

PostgreSQL has a Compose readiness healthcheck. Backend/frontend health was verified by
startup logs and real HTTP; the Compose file does not define dedicated healthchecks for
those services. Startup/restart can briefly return 502 while the API initializes.

## F. Remaining issues and limits

| Issue | Release impact |
| --- | --- |
| No service worker / offline cold start | Nonblocking for documented API-outage simulation. Frontend assets must remain reachable on refresh. Would block a requirement for full-network-offline cold starts. |
| Manual sync; at most 100 payments per terminal per click | Documented operational limit; repeat sync for larger queues. Auto/mobile policy toggles are disabled. |
| Conflict records retained but no conflict-edit workflow | Nonblocking for a conflict-detection simulator; review is manual. No false successful resolution is shown. |
| Unpaginated lists and per-merchant/terminal query fan-out | Suitable for bounded simulation data. No large-history load/SLA benchmark was performed; not approved for unbounded throughput. |
| ApexCharts core chunk about 558 kB minified / 163 kB gzip | Existing build warning; no measured correctness issue. Warning was not suppressed. |
| Browser storage can be evicted/cleared and is not encrypted | Platform/operational limit. Account UI isolation is verified; shared-profile developer tools can inspect data. |
| Logout does not revoke an already-issued bearer token | Stateless JWT contract; token expires in one hour. No refresh/revocation service. |
| Public deployment hardening / image OS scan | TLS setup documented, not provisioned. OS scan, external rate limits, backups, monitoring and public security testing remain deployment responsibilities. |
| Browser/accessibility coverage | Chromium at three widths, targeted keyboard checks and two inspected mobile screenshots. Firefox/WebKit, physical devices and full WCAG conformance are unverified. |
| Display placeholders / unused presentation code | Some terminal metrics remain “—”; old standalone SyncControls/SyncQueue/SyncSummary/BatchActivity and TerminalActivity/TerminalStatus presentation components remain unused. They are not on active paths; removing them was deferred to avoid unrelated cleanup. |
| Existing development DB credential mismatch | Safely documented; original credentials not rotated or reset. Does not affect the verified isolated stack. |

No known release-blocking functional defect remains within the stated shipping scope.
No npm or resolved-Maven-runtime critical advisory remains in the executed scans. This
statement does not include unperformed container OS scans or future advisories.

### Shipping checklist

- [x] Backend build and 38 tests pass.
- [x] Frontend install, TypeScript/lint/build/format and 12 tests pass.
- [x] Playwright discovers and executes 15 real scenarios in both runtime modes.
- [x] Critical E2E workflows, actual API outage, refresh and interruption recovery pass.
- [x] PostgreSQL authentication, Flyway and Compose startup/restart are verified.
- [x] Authentication and cross-account authorization are verified.
- [x] Offline persistence, synchronization, idempotency and concurrency are verified.
- [x] No known critical functional issue or npm/Maven advisory remains in the tested scope.
- [x] Documentation reflects actual behavior and limitations.
- [ ] Optional public TLS provisioning, container OS scanning and cross-browser/device certification remain unverified.

## G. Reproduction commands

First follow [Docker setup](docker.md) to create a private
`/tmp/ghostpay-release-audit.env` with independent generated secrets. Do not reuse an
existing development/production project for audit fixtures.

```sh
# repository root
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit up --build -d

cd backend
./gradlew clean test build --console=plain
./gradlew exportRuntimeDependencies
cd ..
python3 scripts/audit-runtime-dependencies.py

cd frontend
npm ci
npm run lint
npm run build
npm test
npm run format:check
npm audit
npm audit --omit=dev
npx playwright install chromium
npm run test:e2e -- --list
E2E_BASE_URL=http://127.0.0.1:3000 E2E_BACKEND_CONTAINER=ghostpay-release-audit-backend-1 npm run test:e2e
npm run test:e2e
cd ..

# Run sequentially after browser tests, because restart interrupts the stack:
python3 scripts/check-release-http.py
python3 scripts/check-release-restart.py

# Intentionally expects a nonzero Gradle exit with explicit missing-configuration error:
cd backend
env -u DATABASE_URL -u DATABASE_USERNAME -u DATABASE_PASSWORD ./gradlew flywayRepair --console=plain
cd ..

# Stop only the audit project; retain its volume:
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit down
```

Do not run a configured Flyway repair as a test. The fail-closed command above removes all
datasource environment variables so it cannot connect. Review generated backend JUnit/OSV
reports under `backend/build`, Playwright JSON/traces/screenshots under
`frontend/test-results`, and smoke-check snapshots under `/tmp`. Missing Docker, browser,
network or datasource configuration must be reported as blocked, not passed.
