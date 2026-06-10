import { memo } from 'react';
import type { TrendPoint } from '@shared/types';
import { formatDate, formatKg } from '../lib/format';

/** Props for the 8-week trend chart + table. */
export interface TrendChartProps {
  trend: TrendPoint[];
}

const WIDTH = 560;
const HEIGHT = 160;
const PAD = 12;

/**
 * 8-week trend as an inline SVG line (decorative, aria-hidden) paired
 * with a data table of the same values as the accessible alternative.
 */
export const TrendChart = memo(function TrendChart({ trend }: TrendChartProps): JSX.Element {
  const max = Math.max(...trend.map((point) => point.totalKg), 1);
  const stepX = trend.length > 1 ? (WIDTH - PAD * 2) / (trend.length - 1) : 0;
  const points = trend
    .map((point, index) => {
      const x = PAD + index * stepX;
      const y = HEIGHT - PAD - (point.totalKg / max) * (HEIGHT - PAD * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="trend">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="trend-svg"
        focusable="false"
      >
        <polyline points={points} fill="none" className="trend-line" />
        {trend.map((point, index) => (
          <circle
            key={point.weekStart}
            cx={PAD + index * stepX}
            cy={HEIGHT - PAD - (point.totalKg / max) * (HEIGHT - PAD * 2)}
            r="4"
            className="trend-dot"
          />
        ))}
      </svg>
      <table>
        <caption>Weekly emissions, last 8 weeks</caption>
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Emissions</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((point) => (
            <tr key={point.weekStart}>
              <th scope="row">{formatDate(point.weekStart)}</th>
              <td>{formatKg(point.totalKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
