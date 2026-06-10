import { api } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { InsightCard } from '../components/InsightCard';

/** Insights page: ranked, quantified suggestions from the rule engine. */
export default function Insights(): JSX.Element {
  usePageTitle('Insights');
  const { data, error, loading } = useAsync((signal) => api.getInsights(signal), []);

  return (
    <>
      <h1>Insights</h1>
      <p>
        Personalised suggestions computed from your last 7 days of activity. Every suggestion
        quantifies its estimated weekly saving.
      </p>
      {loading && <p role="status">Loading insights…</p>}
      {error && <p role="alert">Could not load insights: {error}</p>}
      {data && (
        <div className="card-list">
          {data.data.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </>
  );
}
