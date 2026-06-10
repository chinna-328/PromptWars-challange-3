# Security — Threat Model & Mitigations

EcoTrace is a single-user, local-first app, but it is built as if it were
internet-facing: every input is untrusted, every query is parameterised, and
errors never leak internals.

## Threat model

| #   | Threat                                             | Mitigation                                                                                                                                                                                                   | Where in code                                                            |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | SQL injection                                      | Prepared statements **only** — every query is compiled once with bound parameters; no SQL is ever assembled from strings                                                                                     | `server/src/db/activityRepo.ts`, `server/src/db/goalRepo.ts`             |
| 2   | Malicious / malformed input                        | zod validation at every route boundary before any logic runs: types, ranges, enum membership, date validity, `.strict()` rejection of unknown fields                                                         | `server/src/schemas/*`, `server/src/middleware/validate.ts`              |
| 3   | Tampered emission values                           | Emissions are computed **server-side** from the shared factor table; a client-supplied `emissionsKg` is rejected by the strict schema (tested)                                                               | `server/src/services/activityService.ts`, `tests/api/activities.test.ts` |
| 4   | XSS                                                | React escapes all rendered values by default; `dangerouslySetInnerHTML` is never used (grep-verifiable); helmet sets a Content-Security-Policy                                                               | entire `client/src`, `server/src/app.ts`                                 |
| 5   | Common HTTP attacks (sniffing, clickjacking, etc.) | `helmet()` security headers; `x-powered-by` disabled                                                                                                                                                         | `server/src/app.ts`                                                      |
| 6   | Cross-origin abuse                                 | CORS restricted to one explicit origin from validated env (`CORS_ORIGIN`) — no wildcard                                                                                                                      | `server/src/app.ts`, `server/src/lib/env.ts`                             |
| 7   | Flooding / abuse                                   | Rate limiting on all `/api` routes (100 req/15 min) plus a stricter write limit (30 req/15 min); standard `RateLimit` headers                                                                                | `server/src/middleware/rateLimiter.ts`                                   |
| 8   | Oversized payload DoS                              | `express.json({ limit: '10kb' })`; 413 handled with the standard error envelope                                                                                                                              | `server/src/app.ts`, `server/src/middleware/errorHandler.ts`             |
| 9   | Information leakage via errors                     | Single error boundary: operational errors return safe `{ error: { code, message } }`; unexpected errors are logged in full server-side and answered with a generic 500 — no stack traces to clients (tested) | `server/src/middleware/errorHandler.ts`, `tests/api/security.test.ts`    |
| 10  | Secrets in code / misconfiguration                 | No secrets in the repo; `.env` is gitignored, `.env.example` documents every variable; env is validated with zod at startup so bad config fails fast                                                         | `.env.example`, `server/src/lib/env.ts`                                  |
| 11  | Resource exhaustion via queries                    | List endpoints are paginated with `limit ≤ 100` enforced by schema; aggregations run in SQL over an indexed column                                                                                           | `server/src/schemas/activitySchemas.ts`, `server/src/db/schema.ts`       |

## Out of scope

Authentication/multi-user isolation is intentionally out of scope (single
local user, per SPEC). Adding it would slot in as middleware before the
routers without changing the validation or data layers.

## Verification

The `tests/api/security.test.ts` suite asserts helmet headers, the 404/413/
400 error envelopes, the absence of stack traces in responses, and 429
rate-limit behaviour. Validation rejection paths are covered in
`server/src/schemas/activitySchemas.test.ts` and `tests/api/activities.test.ts`.
