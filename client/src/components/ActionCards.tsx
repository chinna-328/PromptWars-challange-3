import { useState } from 'react';
import type { Insight } from '@shared/types';

/** Lifecycle of an action card. */
type ActionState = 'todo' | 'committed' | 'done';

const STORAGE_KEY = 'ecotrace-actions';

const loadStates = (): Record<string, ActionState> => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      ActionState
    >;
  } catch {
    return {};
  }
};

/** Props: insights become committable action cards. */
export interface ActionCardsProps {
  insights: Insight[];
}

/**
 * Action cards generated from insights: Commit → Mark done. Completion
 * state persists in localStorage (single-user local app — no server
 * round-trip needed) and is announced via an aria-live region.
 */
export function ActionCards({ insights }: ActionCardsProps): JSX.Element {
  const [states, setStates] = useState<Record<string, ActionState>>(loadStates);
  const [announcement, setAnnouncement] = useState('');

  const actionable = insights.filter((insight) => insight.estimatedWeeklySavingKg > 0);

  const transition = (insight: Insight, next: ActionState): void => {
    const updated = { ...states, [insight.id]: next };
    setStates(updated);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setAnnouncement(
      next === 'committed'
        ? `Committed: ${insight.title}`
        : `Done: ${insight.title} — about ${insight.estimatedWeeklySavingKg} kg CO2e saved this week`,
    );
  };

  if (actionable.length === 0) {
    return <p>Log some activities to unlock suggested actions.</p>;
  }

  return (
    <>
      <ul className="card-list action-list">
        {actionable.map((insight) => {
          const state = states[insight.id] ?? 'todo';
          return (
            <li key={insight.id} className="card action-card">
              <h3>{insight.title}</h3>
              <p>{insight.body}</p>
              <p>
                <strong>~{insight.estimatedWeeklySavingKg} kg CO2e/week</strong> ·{' '}
                {state === 'done'
                  ? 'Completed ✓'
                  : state === 'committed'
                    ? 'Committed'
                    : 'Not started'}
              </p>
              {state === 'todo' && (
                <button type="button" onClick={() => transition(insight, 'committed')}>
                  Commit<span className="visually-hidden"> to {insight.title}</span>
                </button>
              )}
              {state === 'committed' && (
                <button type="button" onClick={() => transition(insight, 'done')}>
                  Mark done<span className="visually-hidden">: {insight.title}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className="form-status">
        {announcement}
      </p>
    </>
  );
}
