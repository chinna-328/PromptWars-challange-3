# 🌿 EcoTrace — Carbon Footprint Tracker

EcoTrace helps you **understand, track and reduce** your personal carbon
footprint. Log everyday activities (transport, energy, food, shopping), see
your impact in kg CO2e on a dashboard, and get **personalised, quantified
suggestions** — never "be greener", always "swapping 2 red-meat meals for
vegetarian saves ~12.0 kg CO2e/week".

## Why it matters

Most personal emissions hide in a few repeated habits. EcoTrace makes them
visible (dashboard + 8-week trend), explains them (education page, cited
emission factors), and turns them into actions (rule-based insights → action
cards → weekly budget + streaks).

## Architecture

```
┌──────────────────────────┐        ┌─────────────────────────────┐
│  client/  React 18 + TS  │  /api  │  server/  Express + TS      │
│  ├─ pages (lazy routes)  │ ─────► │  ├─ routes   (thin)         │
│  ├─ components           │  JSON  │  ├─ middleware (zod, rate   │
│  ├─ hooks                │        │  │   limit, error boundary) │
│  └─ lib (api, format)    │        │  ├─ services (pure logic)   │
└────────────┬─────────────┘        │  ├─ schemas  (zod)          │
             │                      │  └─ db (prepared stmts)     │
             │   ┌──────────────┐   └──────────────┬──────────────┘
             └──►│   shared/    │◄─────────────────┘
                 │ types, dates,│            ┌──────────┐
                 │ emission     │            │  SQLite  │
                 │ factors+calc │            └──────────┘
                 └──────────────┘
```

The `shared/` package is the single source of truth: emission factors (with
source citations), the `calculateEmissions` pure function, date helpers and
API types are used by both sides — the server computes authoritative values,
the client reuses the same code only for previews and labels.

Request flow: `UI → api client → route → rate limit → zod validation →
service (pure logic) → prepared statement → SQLite`, with one error
boundary translating every failure into `{ error: { code, message } }`.

### Design decisions

- **SQLite via better-sqlite3** — a single-user local app needs zero ops; a
  synchronous embedded DB removes connection pools and async overhead while
  prepared statements keep it injection-proof.
- **Server-side emission computation** — clients are never trusted with
  `emissionsKg`; the strict zod schema rejects it and the server recomputes
  from the shared factor table (see SECURITY.md).
- **Rule-based insights, not ML** — 11 pure deterministic rules are fully
  unit-testable, explainable to the user, and quantify every suggestion.
- **Hand-rolled SVG charts** — a chart library would dwarf the rest of the
  bundle; two small components + paired data tables are faster and more
  accessible.
- **Pre-aggregated reads** — every dashboard number is a SQL aggregate over
  a covering index, cached for 30s and invalidated on writes
  (see PERFORMANCE.md).

## Features

- **Activity logger** — category → activity → quantity (unit shown) → date →
  note; instant "+3.8 kg CO2e logged" announcement; edit & delete entries.
- **Dashboard** — today / this week / this month totals, % change vs the
  previous period, category breakdown (chart **and** data table), 8-week
  trend, global-average reference for context.
- **Insights engine** — 11 deterministic, rule-based checks over your last 7
  days, ranked by estimated weekly saving, every one quantified.
- **Actions & goals** — weekly kg CO2e budget with accessible progress bar,
  commit/complete action cards, daily logging streak.
- **Understand** — what CO2e means, where every factor comes from, and how
  the maths works.

## Getting started

```bash
npm install
npm run dev        # API on :3000, client on :5173 (proxied /api)
```

Copy `.env.example` to `.env` to customise port, DB path or CORS origin —
all variables are validated at startup. The SQLite database file is created
automatically.

```bash
npm run lint       # ESLint (typescript-eslint + jsx-a11y, error level)
npm run typecheck  # tsc strict, client + server
npm test           # 151 tests: unit + API + performance + component + integration
npm run coverage   # coverage report (thresholds enforced at 90%)
npm run build      # typecheck + production client bundle
```

## How each quality dimension is addressed

### Code quality

TypeScript `strict` everywhere plus `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` and `noImplicitReturns`; zero `any`, zero
`@ts-ignore`. ESLint enforces complexity ≤ 10, max nesting depth 3 and
function-length budgets at error level. Every exported function has JSDoc
(with `@example` on the core calculations). Small single-purpose modules; no
magic numbers — every emission factor and rule threshold is a named, cited
constant. One `AppError` type + a single error boundary; a tiny `logger`
util instead of `console`. CI (GitHub Actions) runs lint → typecheck →
tests + coverage → build on every push.

### Security

Documented threat model in [SECURITY.md](./SECURITY.md). Highlights:
prepared statements only, zod at every boundary (strict schemas reject
unknown fields — including client-sent emission values), helmet, explicit
CORS origin, two-tier rate limiting, 10kb body limit, generic client errors
with full server-side logging, env validated at startup.

### Efficiency

Documented with measurements in [PERFORMANCE.md](./PERFORMANCE.md).
Highlights: every aggregate runs as SQL `SUM`/`GROUP BY` answered entirely
from a **covering index** (verified by `EXPLAIN QUERY PLAN`, locked in by a
test — a full dashboard aggregation over 10,000 rows takes ~0.8 ms); the
8-week trend is one `GROUP BY` query, not 8; insights consume per-type SQL
aggregates (O(activity types), not O(rows)); summary/insights responses are
served from a 30s TTL cache invalidated on writes; gzip on all responses.
Client: route-level code splitting plus a separate long-term-cached vendor
chunk (app entry 2.4 kB gzipped), `React.memo`/`useMemo`/`useCallback` on
hot paths, debounced live preview, `AbortController` on every fetch, no
heavyweight dependencies (~66 kB total gzipped JS).

### Testing

151 tests across five layers, named as behavioural sentences:

- unit — every emission factor's input→output, zero/negative/NaN/over-cap
  rejection, rounding, week/month boundary date maths, every insight rule,
  streak & budget logic;
- API (supertest) — happy paths, 400 validation, 404, 413, 429 rate limits,
  security headers, error envelope shape;
- performance — cache serves within TTL without re-querying, every
  aggregate uses the covering index (EXPLAIN-verified), 10k-row aggregation
  under 100 ms;
- component (Testing Library, accessible queries only) — labels, aria-live
  announcements, debounced preview, chart/table equivalence, focus on
  invalid fields;
- integration — log activities → dashboard totals match the shared
  calculation exactly.

Coverage on core logic (shared, services, schemas, client lib): **99.7%
lines / 100% functions**, enforced ≥90% via vitest thresholds.

### Accessibility

Built to WCAG 2.1 AA. Semantic landmarks (`header`/`nav`/`main`/`section`),
skip-to-content link, focus moved to `<main>` on route change, `lang="en"`,
per-route titles. Every input has a `<label htmlFor>`; errors are linked via
`aria-describedby`, announced in `aria-live="polite"` regions, and focus
moves to the first invalid field on submit. Charts carry a screen-reader
summary and are always paired with real data tables (decorative SVG parts
`aria-hidden`). Color contrast ≥ 4.5:1; direction/meaning always duplicated
in text (▲ + "up 12% vs previous period"). Visible `:focus-visible`
outlines, `prefers-reduced-motion` respected, `eslint-plugin-jsx-a11y` at
error level with zero violations.

## Emission factor sources

| Domain                   | Source                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Transport & LPG          | UK DEFRA GHG conversion factors (2024)                                     |
| Electricity              | CEA (Central Electricity Authority, India) grid average 2023 — 0.82 kg/kWh |
| Food                     | Poore & Nemecek (2018), _Science_ — food systems meta-analysis             |
| Shopping                 | Apple/Dell product lifecycle reports; UNEP garment estimates               |
| Global average reference | Our World in Data (2023) — ~4.7 t CO2e/person/year ≈ 90 kg/week            |

Factors live in [`shared/emissionFactors.ts`](./shared/emissionFactors.ts),
each with an inline citation. Display values are rounded to one decimal;
storage keeps full precision.
