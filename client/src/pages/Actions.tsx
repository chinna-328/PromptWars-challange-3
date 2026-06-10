import { useState } from 'react';
import { api } from '../lib/api';
import { formatKg } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { ProgressBar } from '../components/ProgressBar';
import { ActionCards } from '../components/ActionCards';

/** Actions & goals: weekly target, budget progress, streak, action cards. */
export default function Actions(): JSX.Element {
  usePageTitle('Actions & goals');
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState('');
  const goal = useAsync((signal) => api.getGoalStatus(signal), []);
  const insights = useAsync((signal) => api.getInsights(signal), []);

  const handleSetGoal = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const value = Number(target);
    if (!target || Number.isNaN(value) || value <= 0) {
      setStatus('Enter a weekly target greater than zero.');
      return;
    }
    try {
      await api.setGoal(value);
      setStatus(`Weekly target set to ${value} kg CO2e.`);
      setTarget('');
      goal.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save the goal.');
    }
  };

  const data = goal.data;
  return (
    <>
      <h1>Actions &amp; goals</h1>

      <section aria-label="Weekly goal" className="card">
        <h2>Weekly emissions budget</h2>
        {goal.loading && <p role="status">Loading goal…</p>}
        {goal.error && <p role="alert">Could not load the goal: {goal.error}</p>}
        {data && (
          <>
            {data.weeklyTargetKg !== null && data.budgetUsedPct !== null ? (
              <ProgressBar
                value={data.budgetUsedPct}
                label="Share of weekly emissions budget used"
                text={`${formatKg(data.thisWeekKg)} of your ${data.weeklyTargetKg} kg budget used (${data.budgetUsedPct}%)`}
              />
            ) : (
              <p>No weekly target yet — set one below to track your progress.</p>
            )}
            <p>
              Logging streak: <strong>{data.streakDays}</strong>{' '}
              {data.streakDays === 1 ? 'day' : 'days'}
            </p>
          </>
        )}
        <form onSubmit={handleSetGoal}>
          <div className="field">
            <label htmlFor="weeklyTarget">Weekly target (kg CO2e)</label>
            <input
              id="weeklyTarget"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Set target</button>
          </div>
          <p role="status" aria-live="polite" className="form-status">
            {status}
          </p>
        </form>
      </section>

      <section aria-label="Suggested actions">
        <h2>Suggested actions</h2>
        {insights.loading && <p role="status">Loading actions…</p>}
        {insights.error && <p role="alert">Could not load actions: {insights.error}</p>}
        {insights.data && <ActionCards insights={insights.data.data} />}
      </section>
    </>
  );
}
