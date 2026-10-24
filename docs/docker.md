# Docker operations

Copy the root `.env.example` to `.env`, set independent randomly generated database and
JWT secrets, and run `docker compose up --build -d`. The default project exposes
127.0.0.1:3000 (nginx) and 127.0.0.1:8080 (API); PostgreSQL is internal on port 5432.
The frontend proxies `/api` to Spring Boot. All six Flyway migrations run on backend startup.

## Existing PostgreSQL credentials

`POSTGRES_PASSWORD` only initializes a new volume. Changing `DATABASE_PASSWORD` does not
change an existing database role's password. An unrelated PostgreSQL instance owns host port 5432 on the audited machine; its stored
credentials were not changed or retested. This Compose stack uses its own internal service
and volume, so it avoids that host-port/credential ambiguity. The original development
credential mismatch was documented, not repaired by resetting data.

For an existing GhostPay volume, restore the original password from its secret store and
restart/recreate the backend with that value. If rotation is required, first back up the
database, connect as its administrator, use interactive psql `\password ghostpay`, update
the deployment secret, and recreate the backend. Do not put passwords in shell history.
Never delete a volume, repair Flyway blindly, or disable schema validation to make startup pass.

`docker compose down` retains data. `docker compose restart` retains data and configured
environment. After changing environment variables use `docker compose up -d` to recreate
services; restart alone does not load new environment values.

## Isolated release audit

Use a fresh, unique project name and a private environment file containing generated
secrets. Do not reuse an existing project name for destructive tests:

```sh
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit up --build -d
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit ps
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit logs backend
docker compose --env-file /tmp/ghostpay-release-audit.env -p ghostpay-release-audit down
```

This retains the audit volume too. Resolve port conflicts by stopping the conflicting
application with its owner's consent or using a Compose override for host ports.

Check database authentication over TCP, not just `pg_isready` (which only tests readiness):

```sh
docker compose exec db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT current_database(), current_user"'
```

## Public TLS configuration

The Compose file is a local deployment. Put a TLS reverse proxy on the host in front of
127.0.0.1:3000; do not expose the backend/database ports. For example, a host-installed
Caddy instance with a real DNS name and ports 80/443 reachable can use this Caddyfile:

```caddyfile
pay.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Set `FRONTEND_ORIGINS=https://pay.example.com` and recreate the backend. Caddy obtains and
renews the certificate and redirects HTTP to HTTPS. Provision DNS, backups, secret storage,
request/rate limits, monitoring, and firewall rules for the deployment. This public
configuration is documented but was not provisioned or TLS-tested by the local audit.

nginx resolves the Docker backend name at request time using Docker's internal DNS
resolver (five-second cache). This allows the frontend process to start while the API
name is temporarily missing and recover after backend recreation. Requests can return
502 while the backend is restarting; they are recoverable and do not clear the local queue.
