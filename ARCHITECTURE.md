# EcoTrace — Architecture

How the codebase is laid out, how a request travels through it, and why the
five decisions that shape it were made.

## Request flow

```
UI (React page)
  │  user action
  ▼
api client (client/src/lib/api.ts — the only fetch in the app)
  │  JSON over /api, AbortController on every read
  ▼
Express route (server/src/routes — thin: wire-up only)
  │
  ├─ rate limiter   (general 100/15min, stricter on writes)
  ├─ zod validation (server/src/schemas — strict, rejects unknown fields)
  ▼
service (server/src/services — pure business logic)
  │
  ▼
prepared statement (server/src/db — the only SQL in the app)
  │
  ▼
SQLite (WAL, covering index on (date, category, emissions_kg))
```

Every failure on that path funnels into one error boundary
(`server/src/middleware/errorHandler.ts`) and leaves the process as
`{ error: { code, message } }` — never a stack trace.

## Folder map

| Folder | Responsibility |
| --- | --- |
| `client/src/pages` | One component per route, lazy-loaded (Dashboard, LogActivity, Insights, Actions, Understand) |
| `client/src/components` | Small presentational components with typed props (form, charts, lists, nav, icons) |
| `client/src/hooks` | Data fetching (`useAsync` with abort), debouncing, per-route titles |
| `client/src/lib` | The single API client and pure display formatters |
| `server/src/routes` | Thin route handlers: compose middleware, call a service, send JSON |
| `server/src/middleware` | zod validation, rate limiting, the single error boundary |
| `server/src/services` | Business logic — pure functions over repository aggregates |
| `server/src/schemas` | zod schemas for every API boundary (body, query, params) |
| `server/src/db` | Schema, connection factory, prepared-statement repositories |
| `server/src/lib` | `AppError`, TTL cache, env validation, logger |
| `shared/` | Emission factors (cited), the one emissions calculation, date helpers, API types — imported by both sides |
| `tests/` | Cross-package API, integration and performance tests (supertest against an in-memory DB) |

## Design decisions

**SQLite via better-sqlite3.** A single-user tracker needs zero operational
surface: no connection pool, no server process, no async ceremony — and the
synchronous API makes repositories trivially testable against `:memory:`.
The tradeoff is single-writer concurrency, which a personal app never hits;
WAL mode covers the read-while-write case.

**Rule-based insights, not an LLM/API.** Eleven pure rules over aggregated
week stats are deterministic, fully unit-testable, explainable to the user
and free of network flakiness; every suggestion quantifies its saving from
the same cited factor table the logger uses. The tradeoff is less open-ended
advice — accepted, because unverifiable advice would undermine the app's
evidence-led voice.

**Server-side emission computation.** The client never sends `emissionsKg`;
the strict zod schema rejects the field and the server recomputes from
`shared/emissionFactors.ts`. This keeps stored data trustworthy even against
a hostile client, at the cost of duplicating the calculation client-side for
the live preview — which is why the calculation lives in `shared/` and is
imported by both, so the two paths cannot drift.

**Strict TypeScript everywhere.** `strict` plus `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitReturns` and
`noFallthroughCasesInSwitch` turn whole bug classes (undefined indexing,
optional-property typos, missed branches) into compile errors. The tradeoff
is more explicit narrowing at boundaries — exactly where explicitness pays
for itself.

**A 30-second response cache.** Summary/insights reads are answered from an
in-process TTL cache that writes invalidate immediately. 30s is long enough
to absorb dashboard navigation bursts (the real read pattern) and short
enough that even a missed invalidation self-heals within one period-picker
glance; invalidate-on-write keeps the common case exact. A longer TTL would
buy nothing — reads are already ~0.8 ms from the covering index — while
widening the staleness window.

Related documents: [SECURITY.md](./SECURITY.md) (threat model),
[PERFORMANCE.md](./PERFORMANCE.md) (optimizations with measurements),
[README.md](./README.md) (features, setup, quality dimensions).
