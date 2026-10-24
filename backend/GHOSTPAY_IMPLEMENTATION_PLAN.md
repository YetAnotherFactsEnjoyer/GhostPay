> Historical implementation notes. Current behavior, executed checks, and limitations are documented in [release readiness](../docs/RELEASE-READINESS.md).

# GhostPay backend implementation plan

## Already available
- Java 21 / Spring Boot / PostgreSQL / Flyway
- Identity registration, login, JWT and current-user endpoint
- Existing error handling and authentication tests

## Empty module scaffolds (not implemented)
- merchant: merchant ownership and access checks
- terminal: virtual terminal registration and connectivity
- payment: immutable simulated payment records
- sync: batch ingestion, idempotency and conflict classification
- audit: persisted history of synchronization decisions

Each module has api/dto, application, domain and persistence folders. These are intentionally empty.

## Recommended implementation order
1. Define invariants and database constraints for merchants and terminals.
2. Implement merchant/terminal entities, repositories, services, controllers, and ownership tests.
3. Define payment identifiers, statuses and the distinction between retry and conflict.
4. Design batch ingestion with unique constraints, transaction boundaries and concurrent retry tests.
5. Persist sync outcomes and expose ledger/reconciliation queries.
6. Integrate a simulated frontend and document limitations (no real card authorization).

## Important
- Existing Flyway V1/V2 remain as inherited; create new migrations for GhostPay tables.
- Existing identity and security code is reused, not newly reimplemented.
- The current configuration expects DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD and JWT_SECRET.
- Check Neurogine's actual assignment requirements and AI-use rules before submission.
- No business feature endpoints or database migrations have been implemented for GhostPay.
