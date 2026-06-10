# Performance Notes

Every non-obvious optimization is marked with a greppable `// PERF:` comment
at the site. This file maps each one to its code and its measured effect.

## Database

| Optimization                                                                            | Where                                                                     | Effect                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| All aggregation in SQL (`SUM`/`GROUP BY`) — row data is never fetched and reduced in JS | `server/src/db/activityRepo.ts`                                           | full summary aggregation (total + category breakdown + 8-week trend) over **10,000 rows: ~0.8 ms** |
| Covering composite index `(date, category, emissions_kg)`                               | `server/src/db/schema.ts`                                                 | aggregates are answered entirely from the index — see EXPLAIN output below                         |
| 8-week trend in **one** `GROUP BY` query (was 8 queries — N+1)                          | `ActivityRepo.sumByWeek`, used by `server/src/services/summaryService.ts` | 1 indexed query per trend instead of 8                                                             |
| Insights engine inputs pre-aggregated per activity type in SQL                          | `ActivityRepo.statsByType` → `server/src/services/insightStats.ts`        | rule evaluation is O(activity types), independent of logged volume                                 |
| Prepared statements compiled once at startup, reused for the app lifetime               | `ActivityRepo` / `GoalRepo` constructors                                  | no per-request SQL parsing                                                                         |
| `journal_mode=WAL` + `synchronous=NORMAL`                                               | `server/src/db/index.ts`                                                  | concurrent reads + fast, still crash-safe writes                                                   |
| Pagination enforced server-side (`limit ≤ 100` via zod)                                 | `server/src/schemas/activitySchemas.ts`                                   | unbounded list responses are impossible                                                            |

### EXPLAIN QUERY PLAN evidence

Before (single-column `date` index) vs after (covering index):

```
BEFORE  sum:    SEARCH activities USING INDEX idx_activities_date (date>? AND date<?)
AFTER   sum:    SEARCH activities USING COVERING INDEX idx_activities_date_category (date>? AND date<?)
AFTER   byCat:  SEARCH activities USING COVERING INDEX idx_activities_date_category (date>? AND date<?)
AFTER   trend:  SEARCH activities USING COVERING INDEX idx_activities_date_category (date>? AND date<?)
```

No query on `activities` performs a table scan. This is locked in by a test:
`tests/api/performance.test.ts` › _answers every aggregate from the covering
index — no table scans_.

## API

| Optimization                                                                                                                                             | Where                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 30s in-memory TTL cache for `/api/summary` and `/api/insights`, invalidated on every activity write (read-heavy endpoints, recomputed only after writes) | `server/src/lib/cache.ts`, wired in `server/src/app.ts`                      |
| `Cache-Control: private, max-age=30` on summary/insights reads; `no-store` on mutations                                                                  | `server/src/routes/summary.ts`, `routes/insights.ts`, `routes/activities.ts` |
| gzip compression on all responses                                                                                                                        | `compression()` in `server/src/app.ts`                                       |
| Cache behaviour tested: _serves summary from cache within TTL without re-querying_                                                                       | `tests/api/performance.test.ts`                                              |

## Frontend

| Optimization                                                                                                                | Where                                                                                        | Effect                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Route-level code splitting (`React.lazy` + `Suspense`)                                                                      | `client/src/App.tsx`                                                                         | each page ships its own chunk (1–5.5 kB)                                                                |
| Vendor chunk split (react/react-dom/router)                                                                                 | `client/vite.config.ts`                                                                      | **app entry 5.2 kB (2.4 kB gzip)**; the 164 kB vendor chunk stays browser-cached across app deployments |
| `React.memo` on chart/list components, `useMemo` for derived totals, `useCallback` for handlers passed to memoized children | `CategoryBreakdown`, `TrendChart`, `ActivityList`, `InsightCard`, `Dashboard`, `LogActivity` | charts/lists re-render only when their data changes                                                     |
| Debounced (300 ms) live emissions preview                                                                                   | `client/src/hooks/useDebouncedValue.ts` + `ActivityForm`                                     | one recomputation per typing pause, not per keystroke                                                   |
| `AbortController` on every data fetch                                                                                       | `client/src/hooks/useAsync.ts`                                                               | in-flight requests cancelled on unmount/param change; no wasted work, no stale-response races           |
| No heavyweight dependencies                                                                                                 | —                                                                                            | native `Intl` for formatting, hand-rolled SVG charts; total JS ≈ **66 kB gzipped**                      |

## Bundle (vite build, production)

```
dist/assets/index (entry)     5.19 kB │ gzip:  2.43 kB
dist/assets/vendor          164.63 kB │ gzip: 53.86 kB   (react, react-dom, router — long-term cached)
route chunks (each)          0.1–5.5 kB
CSS                           4.24 kB │ gzip:  1.42 kB
```
