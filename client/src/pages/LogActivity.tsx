import { useCallback, useState } from 'react';
import type { ActivityRecord } from '@shared/types';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import { usePageTitle } from '../hooks/usePageTitle';
import { ActivityForm } from '../components/ActivityForm';
import { ActivityList } from '../components/ActivityList';

/** Log activity page: the form plus the editable list of recent entries. */
export default function LogActivity(): JSX.Element {
  usePageTitle('Log activity');
  const [editing, setEditing] = useState<ActivityRecord | null>(null);
  const { data, error, loading, reload } = useAsync((signal) => api.listActivities(20, signal), []);

  // PERF: stable handlers so the memoized ActivityList only re-renders
  // when the list data itself changes, not on every parent render.
  const handleEdit = useCallback((activity: ActivityRecord): void => {
    setEditing(activity);
    window.scrollTo({ top: 0 });
  }, []);

  const handleDelete = useCallback(
    (activity: ActivityRecord): void => {
      void api.deleteActivity(activity.id).then(() => {
        setEditing((current) => (current?.id === activity.id ? null : current));
        reload();
      });
    },
    [reload],
  );

  return (
    <>
      <h1>{editing ? 'Edit activity' : 'Log an activity'}</h1>
      <ActivityForm
        editing={editing}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
        onCancelEdit={() => setEditing(null)}
      />

      <section aria-label="Recent activities">
        {loading && <p role="status">Loading activities…</p>}
        {error && <p role="alert">Could not load activities: {error}</p>}
        {data && (
          <ActivityList activities={data.data} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </section>
    </>
  );
}
