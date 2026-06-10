import { memo } from 'react';
import { EMISSION_FACTORS, CATEGORY_LABELS } from '@shared/emissionFactors';
import type { ActivityRecord } from '@shared/types';
import { formatDate, formatKg } from '../lib/format';

/** Props for the recent-activities table. */
export interface ActivityListProps {
  activities: ActivityRecord[];
  onEdit: (activity: ActivityRecord) => void;
  onDelete: (activity: ActivityRecord) => void;
}

/**
 * Recent activities as a real table (sortable by the server: newest
 * first) with per-row Edit/Delete buttons labelled for screen readers.
 * Memoized — it only re-renders when the list itself changes.
 */
export const ActivityList = memo(function ActivityList({
  activities,
  onEdit,
  onDelete,
}: ActivityListProps): JSX.Element {
  if (activities.length === 0) {
    return <p>No activities yet — log your first one above.</p>;
  }
  return (
    <table>
      <caption>Recent activities</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Activity</th>
          <th scope="col">Category</th>
          <th scope="col">Quantity</th>
          <th scope="col">Emissions</th>
          <th scope="col">
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {activities.map((activity) => {
          const factor = EMISSION_FACTORS[activity.activityType];
          const label = `${factor.label} on ${formatDate(activity.date)}`;
          return (
            <tr key={activity.id}>
              <td>{formatDate(activity.date)}</td>
              <td>{factor.label}</td>
              <td>{CATEGORY_LABELS[activity.category]}</td>
              <td>
                {activity.quantity} {factor.unit}
              </td>
              <td>{formatKg(activity.emissionsKg)}</td>
              <td>
                <button type="button" className="secondary" onClick={() => onEdit(activity)}>
                  Edit<span className="visually-hidden"> {label}</span>
                </button>{' '}
                <button type="button" className="danger" onClick={() => onDelete(activity)}>
                  Delete<span className="visually-hidden"> {label}</span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});
