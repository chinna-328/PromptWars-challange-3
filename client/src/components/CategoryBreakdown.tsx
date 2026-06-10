import { memo } from 'react';
import { CATEGORY_LABELS } from '@shared/emissionFactors';
import type { CategoryTotal } from '@shared/types';
import { formatKg } from '../lib/format';

/** Props for the category breakdown chart + table. */
export interface CategoryBreakdownProps {
  byCategory: CategoryTotal[];
}

/**
 * Per-category breakdown: a horizontal bar chart (decorative, aria-hidden)
 * paired with a data table carrying the same numbers — the accessible
 * alternative required by the a11y rules. Bars are labelled with text,
 * so meaning never relies on color alone.
 */
export const CategoryBreakdown = memo(function CategoryBreakdown({
  byCategory,
}: CategoryBreakdownProps): JSX.Element {
  const max = Math.max(...byCategory.map((row) => row.totalKg), 1);
  return (
    <div className="breakdown">
      <div aria-hidden="true" className="bars">
        {byCategory.map((row) => (
          <div key={row.category} className="bar-row">
            <span className="bar-label">{CATEGORY_LABELS[row.category]}</span>
            <div className="bar-track">
              <div
                className={`bar bar-${row.category}`}
                style={{ width: `${(row.totalKg / max) * 100}%` }}
              />
            </div>
            <span className="bar-value">{formatKg(row.totalKg)}</span>
          </div>
        ))}
      </div>
      <table>
        <caption>Emissions by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Emissions</th>
          </tr>
        </thead>
        <tbody>
          {byCategory.map((row) => (
            <tr key={row.category}>
              <th scope="row">{CATEGORY_LABELS[row.category]}</th>
              <td>{formatKg(row.totalKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
