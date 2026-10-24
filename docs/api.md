# GhostPay API

JSON is required for POST requests. All protected endpoints take
`Authorization: Bearer <accessToken>`; the browser stores this in sessionStorage.

| Method | Endpoint | Body / query | Success |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `{email,password}` | 201, `{id,email}` |
| POST | `/api/v1/auth/login` | `{email,password}` | 200, `{accessToken,tokenType}` |
| GET | `/api/v1/account/me` | — | 200, `{id,email}` |
| GET | `/api/v1/merchants` | — | 200, merchant array scoped to owner |
| POST | `/api/v1/merchants` | `{name}` | 201 |
| GET | `/api/v1/terminals` | `?merchantId=<uuid>` | 200 |
| POST | `/api/v1/terminals` | `{name,merchantId}` | 201 |
| GET | `/api/v1/payments` | `?terminalId=<uuid>` | 200 |
| POST | `/api/v1/terminals/{terminalId}/sync` | batch below | 200 |

Only registration and login are public. No update/delete, terminal-disable, direct payment
creation, refresh-token, or conflict-resolution endpoint exists. Lists currently return
all matching records; there is no server pagination.

```json
{
  "batchId": "a7a818a9-9882-497f-87d8-734f772c0dd9",
  "payments": [{
    "localPaymentId": "300bca14-b220-4b2e-9ca1-d983168d264c",
    "purchaseReference": "ORDER-1042",
    "amountMinor": 1200,
    "currency": "MYR"
  }]
}
```

Batches require 1–100 non-null validated payments. Amounts must be positive integer minor
units, currency exactly MYR, and references nonblank with at most 100 characters. Responses
contain `batchId` and ordered `results` with `localPaymentId` and status `ACCEPTED`,
`DUPLICATE`, or `CONFLICT`. `INVALID` is reserved; invalid requests currently fail as a
whole with HTTP 400 before any writes.

Errors use `{code,message,timestamp}`. Invalid DTOs, JSON, UUIDs and missing parameters
return 400. Missing/invalid/expired credentials return 401; disallowed CORS returns 403.
Resource lookups hide missing/unowned resources with 404. Email reuse, changed batch
content, disabled-terminal new syncs and database uniqueness conflicts return 409.
Unexpected failures return a generic 500. Same-batch retries replay original results.
See [offline synchronization](offline-sync.md) for ordering and transaction semantics.
