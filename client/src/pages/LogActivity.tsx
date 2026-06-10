import { useState } from 'react';
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
  const { data, error, loading, reload } = useAsync(() => api.listActivities(20), []);

  const handleDelete = async (activity: ActivityRecord): Promise<void> => {
    await api.deleteActivity(activity.id);
    if (editing?.id === activity.id) setEditing(null);
    reload();
  };

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
          <ActivityList
            activities={data.data}
            onEdit={(activity) => {
              setEditing(activity);
              window.scrollTo({ top: 0 });
            }}
            onDelete={(activity) => {
              void handleDelete(activity);
            }}
          />
        )}
      </section>
    </>
  );
}
