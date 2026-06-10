import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  activityTypesForCategory,
  CATEGORIES,
  CATEGORY_LABELS,
  EMISSION_FACTORS,
  type ActivityType,
  type Category,
} from '@shared/emissionFactors';
import { calculateEmissions } from '@shared/calculateEmissions';
import { todayISO } from '@shared/dates';
import type { ActivityRecord } from '@shared/types';
import { api } from '../lib/api';
import { formatKg } from '../lib/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

/** Quiet period before the live preview recomputes, in ms. */
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Validates a raw quantity string against an activity's constraints.
 * @param raw - the input field value
 * @param factor - the selected activity's factor (for unit and cap)
 * @returns an error message, or null when the quantity is valid
 */
function quantityError(
  raw: string,
  factor: (typeof EMISSION_FACTORS)[ActivityType],
): string | null {
  const value = Number(raw);
  if (!raw || Number.isNaN(value) || value <= 0) {
    return 'Enter a quantity greater than zero.';
  }
  if (value > factor.maxQuantity) {
    return `Maximum is ${factor.maxQuantity} ${factor.unit} per entry.`;
  }
  return null;
}

/** Props for the create/edit activity form. */
export interface ActivityFormProps {
  /** When set, the form edits this record instead of creating. */
  editing?: ActivityRecord | null;
  /** Called after a successful create/update so lists can refresh. */
  onSaved: () => void;
  /** Leaves edit mode without saving. */
  onCancelEdit?: () => void;
}

/**
 * Activity logging form. Every control has a programmatic label, errors
 * render inline next to their field, and the result of a submission is
 * announced through an aria-live region ("+3.8 kg CO2e logged").
 */
export function ActivityForm({ editing, onSaved, onCancelEdit }: ActivityFormProps): JSX.Element {
  const [category, setCategory] = useState<Category>('transport');
  const [activityType, setActivityType] = useState<ActivityType>('car_petrol');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const quantityErrorId = useId();
  const quantityRef = useRef<HTMLInputElement>(null);

  // PERF: the preview recomputes after a 300ms typing pause (debounced),
  // not on every keystroke; useMemo skips recomputation on other renders.
  const debouncedQuantity = useDebouncedValue(quantity, PREVIEW_DEBOUNCE_MS);
  const preview = useMemo(() => {
    const parsedQuantity = Number(debouncedQuantity);
    const factorForPreview = EMISSION_FACTORS[activityType];
    if (
      !debouncedQuantity ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > factorForPreview.maxQuantity
    ) {
      return null;
    }
    return formatKg(calculateEmissions(activityType, parsedQuantity));
  }, [debouncedQuantity, activityType]);

  useEffect(() => {
    if (!editing) return;
    setCategory(editing.category);
    setActivityType(editing.activityType);
    setQuantity(String(editing.quantity));
    setDate(editing.date);
    setNote(editing.note ?? '');
    setStatus('');
  }, [editing]);

  const factor = EMISSION_FACTORS[activityType];

  const handleCategoryChange = (next: Category): void => {
    setCategory(next);
    const [first] = activityTypesForCategory(next);
    if (first) setActivityType(first);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const validationMessage = quantityError(quantity, factor);
    if (validationMessage) {
      setFieldError(validationMessage);
      quantityRef.current?.focus(); // move focus to the invalid field
      return;
    }
    const parsedQuantity = Number(quantity);
    setFieldError('');
    setSaving(true);
    try {
      const input = {
        category,
        activityType,
        quantity: parsedQuantity,
        date,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const saved = editing
        ? await api.updateActivity(editing.id, input)
        : await api.createActivity(input);
      setStatus(
        editing
          ? `Updated: ${formatKg(saved.emissionsKg)} on ${saved.date}`
          : `+${formatKg(saved.emissionsKg)} logged`,
      );
      setQuantity('');
      setNote('');
      onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save the activity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label={editing ? 'Edit activity' : 'Log an activity'}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value as Category)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="activityType">Activity</label>
          <select
            id="activityType"
            value={activityType}
            onChange={(event) => setActivityType(event.target.value as ActivityType)}
          >
            {activityTypesForCategory(category).map((value) => (
              <option key={value} value={value}>
                {EMISSION_FACTORS[value].label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="quantity">Quantity ({factor.unit})</label>
          <input
            id="quantity"
            ref={quantityRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-describedby={fieldError ? quantityErrorId : undefined}
            aria-invalid={fieldError ? true : undefined}
            required
          />
          {fieldError && (
            <p className="field-error" id={quantityErrorId}>
              {fieldError}
            </p>
          )}
          <p className="form-hint" aria-live="polite">
            {preview ? `≈ ${preview}` : ''}
          </p>
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <div className="field field-wide">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            type="text"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {editing ? 'Save changes' : 'Log activity'}
        </button>
        {editing && onCancelEdit && (
          <button type="button" className="secondary" onClick={onCancelEdit}>
            Cancel edit
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className="form-status">
        {status}
      </p>
    </form>
  );
}
