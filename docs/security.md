# Security model and audit scope

GhostPay is a payment simulator. Do not store card numbers, security codes, banking secrets,
or personal payment data in purchase references.

Passwords use BCrypt; registration accepts at least 8 characters and at most 72 UTF-8 bytes.
Public endpoints are registration and login. Stateless HS256 JWTs require a configured
random secret of at least 32 bytes, issuer `ghostpay`, UUID subject, and expiration. The
default lifetime is one hour, with Spring's timestamp validation clock tolerance. Logout
removes the browser session token; issued tokens remain valid until expiration (no server
revocation/refresh-token flow). Authentication failures return 401, generic forbidden
responses 403, and resource ownership lookups hide existence with 404.

Tokens reside in sessionStorage, never URLs or localStorage. Session changes clear TanStack
Query caches; protected routes react to 401/logout. A late 401 from a previous session
cannot clear a newer token. Session tokens remain exposed to same-origin JavaScript, so
XSS prevention and trusted scripts remain necessary. React escapes text; the source audit
found no `dangerouslySetInnerHTML`, eval, or raw SQL built from request values. JPA queries
bind parameters. Sensitive tokens/password hashes are not returned in resource DTOs.

IndexedDB is filtered by account but unencrypted. Users sharing a browser profile can
inspect its local data. Logout deliberately retains unsynchronized payments. Protect the
OS account/browser profile and synchronize before clearing storage.

CORS uses an exact origin allowlist. Compose permits localhost and 127.0.0.1 on port 3000;
public deployments must explicitly set `FRONTEND_ORIGINS` to their HTTPS origin. Cookie
credentials are not used. CSRF is disabled for header-based bearer authentication. Error
responses suppress stack traces, SQL, and exception details. Actuator requires a JWT.
Secrets are required and excluded from git/build contexts; placeholders are documentation,
not acceptable public deployment secrets. See [Docker/TLS](docker.md).

## Dependency checks

```sh
cd frontend
npm audit
npm audit --omit=dev
cd ../backend
./gradlew exportRuntimeDependencies
cd ..
python3 scripts/audit-runtime-dependencies.py
```

The Python check submits resolved Maven package names/versions to OSV and fails for matches
or unavailable/incomplete scan results. It does not upload application code or secrets.
Reports are generated under `backend/build/reports`. npm/OSV results are point-in-time
advisory checks, not proof that a dependency is free from vulnerabilities. Container OS
packages require a separate image vulnerability scan; that scan was not performed here.

The release audit patched Vitest to 4.1.12, React Router to 7.18.4, and the Tailwind
transitive PostCSS selector parser to 7.1.6 using a targeted override (retaining Tailwind 3).
Vitest UI/mocker/tinypool and nested Vite vulnerabilities affect developer tooling; those
packages are not shipped in nginx's static runtime. Router is a runtime dependency; the
app uses fixed local routes and no SSR hydration, limiting the flagged attack paths.
Do not expose development/test servers to untrusted networks.

Backend Jackson 3.1.5 and Tomcat 11.0.24 had OSV matches; compatible patches 3.1.7 and
11.0.25 remove those matches. Tomcat's flagged FORM/DIGEST authenticators are not configured
by GhostPay, which uses Spring JWT security; Jackson attack paths vary by deserialized type.
Patching avoids relying solely on those reachability assumptions.

Advisory sources:

- [Vitest UI execution](https://github.com/advisories/GHSA-5xrq-8626-4rwp)
- [Tinypool prototype pollution](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
- [PostCSS selector complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
- [Jackson core token growth](https://github.com/advisories/GHSA-7hhh-6rmp-j9qf)
- [Jackson forward references](https://github.com/advisories/GHSA-cxp5-3px4-pw24)
- [Tomcat DIGEST replay](https://github.com/advisories/GHSA-9xv2-5v5q-p794)

Public deployment also needs external login throttling, resource/request limits, TLS,
backups and monitoring. They are not provided by the local Compose file.
