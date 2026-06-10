import { memo } from 'react';
import { CATEGORY_LABELS } from '@shared/emissionFactors';
import type { Insight } from '@shared/types';

/** Props for a single insight card. */
export interface InsightCardProps {
  insight: Insight;
}

/**
 * One quantified suggestion: heading, explanation and the estimated
 * weekly saving as plain text (badge color is reinforced by the label).
 */
export const InsightCard = memo(function InsightCard({ insight }: InsightCardProps): JSX.Element {
  const categoryLabel =
    insight.category === 'general' ? 'General' : CATEGORY_LABELS[insight.category];
  return (
    <article className="card insight-card">
      <h3>{insight.title}</h3>
      <p>{insight.body}</p>
      <p className="insight-meta">
        <span className="badge">{categoryLabel}</span>{' '}
        {insight.estimatedWeeklySavingKg > 0 && (
          <strong>Save ~{insight.estimatedWeeklySavingKg} kg CO2e/week</strong>
        )}
      </p>
    </article>
  );
});
