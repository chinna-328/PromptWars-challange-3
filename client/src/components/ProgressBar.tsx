/** Props for the accessible progress bar. */
export interface ProgressBarProps {
  /** Percentage 0–100. */
  value: number;
  /** Accessible name describing what the progress measures. */
  label: string;
  /** Visible text alternative shown next to the bar. */
  text: string;
}

/**
 * Progress bar with full ARIA semantics plus a visible text alternative —
 * the percentage is always readable, never conveyed by the fill alone.
 */
export function ProgressBar({ value, label, text }: ProgressBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-wrap">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
        className="progress-track"
      >
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <p className="progress-text">{text}</p>
    </div>
  );
}
