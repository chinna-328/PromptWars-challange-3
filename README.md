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
npm test           # 138 tests: unit + API (supertest) + component + integration
npm run coverage   # coverage report (thresholds enforced at 90%)
npm run build      # typecheck + production client bundle
```

## How each quality dimension is addressed

### Code quality

TypeScript `strict` everywhere (plus `noUncheckedIndexedAccess`), zero `any`,
zero `@ts-ignore`. Every exported function has JSDoc. Small single-purpose
modules; no magic numbers — every emission factor and rule threshold is a
named, cited constant. One `AppError` type + a single error boundary; a tiny
`logger` util instead of `console`.

### Security

Documented threat model in [SECURITY.md](./SECURITY.md). Highlights:
prepared statements only, zod at every boundary (strict schemas reject
unknown fields — including client-sent emission values), helmet, explicit
CORS origin, two-tier rate limiting, 10kb body limit, generic client errors
with full server-side logging, env validated at startup.

### Efficiency

All aggregation happens in SQL (`SUM`/`GROUP BY` over an indexed `date`
column) — row data is never fetched to reduce in JS. Pure calculation
functions are O(n) and trivially memoizable. React: route-level code
splitting (`React.lazy`), `React.memo` on chart/list components, `useMemo`
for derived dashboard values. No heavyweight dependencies — native `Intl`
for formatting, hand-rolled SVG charts instead of a chart library.

### Testing

138 tests across four layers, named as behavioural sentences:

- unit — every emission factor's input→output, zero/negative/NaN/over-cap
  rejection, rounding, week/month boundary date maths, every insight rule,
  streak & budget logic;
- API (supertest) — happy paths, 400 validation, 404, 413, 429 rate limits,
  security headers, error envelope shape;
- component (Testing Library, accessible queries only) — labels, aria-live
  announcements, chart/table equivalence, radio period switching;
- integration — log activities → dashboard totals match the shared
  calculation exactly.

Coverage on core logic (shared, services, schemas, client lib): **99.7%
lines / 100% functions**, enforced ≥90% via vitest thresholds.

### Accessibility

Semantic landmarks (`header`/`nav`/`main`/`section`), skip-to-content link,
focus moved to `<main>` on route change, `lang="en"`, per-route titles.
Every input has a `<label htmlFor>`; errors are linked via
`aria-describedby` and results announced in `aria-live="polite"` regions.
Charts are decorative (`aria-hidden`) and always paired with real data
tables. Color contrast ≥ 4.5:1; direction/meaning always duplicated in text
(▲ + "up 12% vs previous period"). Visible `:focus-visible` outlines,
`prefers-reduced-motion` respected, `eslint-plugin-jsx-a11y` at error level
with zero violations.

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
