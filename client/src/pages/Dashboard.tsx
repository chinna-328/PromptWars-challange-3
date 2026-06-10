import { useMemo, useState } from 'react';
import type { Period } from '@shared/dates';
import { CATEGORY_LABELS } from '@shared/emissionFactors';
import { api } from '../lib/api';
import { describeChange, formatKg } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { TrendChart } from '../components/TrendChart';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

/**
 * Global average reference: ~4.7 t CO2e per person per year ≈ 90 kg/week
 * (Our World in Data, 2023) — shown so users can place their own number.
 */
const GLOBAL_AVG_WEEKLY_KG = 90;

/** Dashboard: period totals, comparison, breakdown and 8-week trend. */
export default function Dashboard(): JSX.Element {
  usePageTitle('Dashboard');
  const [period, setPeriod] = useState<Period>('week');
  const { data: summary, error, loading } = useAsync(() => api.getSummary(period), [period]);

  // Derived values are memoized so re-renders don't recompute them.
  const topCategory = useMemo(() => {
    if (!summary) return null;
    const top = [...summary.byCategory].sort((a, b) => b.totalKg - a.totalKg)[0];
    return top && top.totalKg > 0 ? top : null;
  }, [summary]);

  const change = describeChange(summary?.changePct ?? null);

  return (
    <>
      <h1>Dashboard</h1>

      <fieldset className="segmented">
        <legend>Period</legend>
        {PERIODS.map((option) => (
          <span key={option.value}>
            <input
              type="radio"
              id={`period-${option.value}`}
              name="period"
              value={option.value}
              checked={period === option.value}
              onChange={() => setPeriod(option.value)}
            />
            <label htmlFor={`period-${option.value}`}>{option.label}</label>
          </span>
        ))}
      </fieldset>

      {loading && <p role="status">Loading summary…</p>}
      {error && <p role="alert">Could not load the summary: {error}</p>}

      {summary && (
        <>
          <section aria-label="Totals" className="stat-grid">
            <div className="card stat">
              <h2>Total emissions</h2>
              <p className="stat-value">{formatKg(summary.totalKg)}</p>
              <p className={`stat-change stat-${change.direction}`}>
                <span aria-hidden="true">{change.arrow}</span> {change.text}
              </p>
            </div>
            <div className="card stat">
              <h2>Top category</h2>
              <p className="stat-value">
                {topCategory ? CATEGORY_LABELS[topCategory.category] : '—'}
              </p>
              <p>{topCategory ? formatKg(topCategory.totalKg) : 'Nothing logged yet'}</p>
            </div>
            <div className="card stat">
              <h2>For context</h2>
              <p className="stat-value">{GLOBAL_AVG_WEEKLY_KG} kg</p>
              <p>global average per person per week (Our World in Data, 2023)</p>
            </div>
          </section>

          <section aria-label="Category breakdown">
            <h2>By category</h2>
            <CategoryBreakdown byCategory={summary.byCategory} />
          </section>

          <section aria-label="Eight week trend">
            <h2>8-week trend</h2>
            <TrendChart trend={summary.trend} />
          </section>
        </>
      )}
    </>
  );
}
