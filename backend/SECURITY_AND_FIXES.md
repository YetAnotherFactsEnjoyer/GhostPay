> Historical implementation notes. Current behavior, executed checks, and limitations are documented in [release readiness](../docs/RELEASE-READINESS.md).

# Exception handling, security review and integration tests

## Scope

Inspected all backend entities, repositories, services, controllers, request and
response DTOs, security configuration, Flyway migrations and existing tests.
Preserved package-by-feature structure, public endpoint contracts, stateless JWT,
all existing migration files, batch hashing and per-terminal locking.
Payment creation remains part of synchronization; no new creation endpoint was added.

## Findings and resolutions

- Merchant and payment ownership failures used generic `IllegalArgumentException`.
  Use explicit not-found exceptions and return 404 without revealing ownership.
- New synchronization on disabled terminals returned 403. Return 409; completed
  batch replay still happens before checking terminal status.
- Malformed JSON, UUIDs and missing parameters lacked consistent handling. Return
  400 with `ApiError`; include field names for bean validation errors.
- Unexpected exceptions lacked a safe fallback. Return a generic 500; database
  integrity conflicts return a generic 409. Preserve framework HTTP statuses.
  Disable error-endpoint exception, message, binding-error and stacktrace exposure.
- Security filters returned a different error format. Both authentication and
  access-denied handlers now write safe `ApiError` responses, with Bearer challenges.
- Existing JWT signature, algorithm, timestamp and issuer verification is retained.
  Require expiration and a canonical UUID subject before requests reach controllers.
  See [Spring Security JWT validation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).
- Cross-origin access was disabled. Add an explicit configurable exact-origin
  allowlist (`FRONTEND_ORIGINS`), empty by default, without cookie credentials.
- Password hashing remains BCrypt. Handle its 72-byte UTF-8 limit explicitly;
  reject oversized registration passwords with 400 and login attempts with 401.
- Normalize login email using `Locale.ROOT`, matching registration.
- Remove an unused, invalid terminal repository method with two parameters for
  a single derived query property. Keep payment listing in a read-only transaction.
- Existing opt-in sync tests could target the development database. All database
  integration tests now always use a disposable PostgreSQL 17 Testcontainer, with
  explicit test JWT properties and the local `.env` import disabled.

## Test coverage

- Payment acceptance and listing, invalid values, duplicate/conflicting IDs,
  terminal scoping, ownership isolation, missing authentication and unique constraints.
- All 13 requested synchronization scenarios, including actual PostgreSQL-triggered
  failure on the second payment, full rollback, ordered events/replay, and concurrent
  identical/different batches sharing one payment.
- Public registration/login, BCrypt hash verification, safe DTOs, duplicate email,
  invalid credentials, wrong JWT signature/issuer, expired/missing expiration,
  malformed/missing subjects, protected Actuator routes, statelessness and CORS.
- Error sanitization, validation field names, framework statuses, and safe 403 handling.

## Verification

Executed from `backend`:

- `./gradlew test --console=plain` — passed: 38 tests, zero failures, zero errors,
  zero skips. The first run revealed a JSON-list assertion issue, corrected before
  the successful full runs.
- `./gradlew build --console=plain` — passed, producing executable and plain JARs;
  the test task reused the successful results from the preceding full test run.
- `git diff --check` — passed from the repository root.

The compiler reports deprecated test JSON API usage and the JVM reports its usual
class-sharing warning with the test agent; neither prevents compilation or testing.
Tests require Docker; there is no skip or development-database fallback.
Existing enum values, including `INVALID`, remain unchanged. Invalid request
payloads continue to fail validation with HTTP 400 before creating a batch.

## Files changed in this task

Paths below are relative to `backend`; existing unrelated working-tree changes
were preserved.

| File | Purpose |
|---|---|
| `build.gradle` | Add the Boot-managed PostgreSQL Testcontainers test dependency. |
| `src/main/java/com/ghostpay/identity/application/LoginUserService.java` | Locale-independent email normalization and BCrypt byte-limit handling. |
| `src/main/java/com/ghostpay/identity/application/RegisterUserService.java` | Reject passwords exceeding the BCrypt byte limit. |
| `src/main/java/com/ghostpay/identity/domain/exception/InvalidPasswordException.java` | Explicit business exception for oversized passwords. |
| `src/main/java/com/ghostpay/merchant/domain/exception/MerchantNotFoundException.java` | Explicit missing/unowned merchant exception. |
| `src/main/java/com/ghostpay/payment/application/PaymentService.java` | Return not-found errors and keep reads transactional. |
| `src/main/java/com/ghostpay/terminal/application/TerminalService.java` | Map missing/unowned merchants to a dedicated exception. |
| `src/main/java/com/ghostpay/terminal/persistence/TerminalRepository.java` | Remove an invalid unused derived query. |
| `src/main/java/com/ghostpay/shared/exception/GlobalExceptionHandler.java` | Centralize validation, business, security and safe fallback responses. |
| `src/main/java/com/ghostpay/shared/security/SecurityConfig.java` | Safe JSON security errors and configured CORS allowlist. |
| `src/main/java/com/ghostpay/shared/security/jwt/JwtConfig.java` | Validate required expiration and UUID subject claims. |
| `src/main/resources/application.yaml` | Configure frontend origins and suppress error details. |
| `src/test/java/com/ghostpay/support/PostgresIntegrationTest.java` | Disposable database, real security and small shared fixtures. |
| `src/test/java/com/ghostpay/identity/persistence/UserRepositoryIntegrationTest.java` | Run UUID persistence checks on the isolated database without opt-in flags. |
| `src/test/java/com/ghostpay/payment/PaymentIntegrationTest.java` | Payment validation, listing, ownership, scoping and database constraints. |
| `src/test/java/com/ghostpay/sync/SyncScenariosIntegrationTest.java` | Independent synchronization scenarios, rollback and concurrency tests. |
| `src/test/java/com/ghostpay/shared/security/SecurityIntegrationTest.java` | Real authentication, token validation, hash safety, statelessness and CORS tests. |
| `src/test/java/com/ghostpay/shared/exception/GlobalExceptionHandlerTest.java` | Validate safe errors, framework status preservation and 403 mapping. |
| `README.md` | Replace unsafe opt-in test instructions and document current configuration. |
| `SECURITY_AND_FIXES.md` | Security findings, test coverage, executed verification and file inventory. |

## Remaining work

No implementation items remain for Steps 5 and 6. Docker is required to run the
integration suite. Configure trusted frontend origins for the deployment before
using the API from a browser on another origin. No development database was used
for verification, and no migrations were changed or added.
