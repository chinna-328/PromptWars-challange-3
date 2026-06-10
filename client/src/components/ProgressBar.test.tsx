import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('exposes progressbar semantics with a name and current value', () => {
    render(<ProgressBar value={48} label="Share of weekly budget used" text="48% used" />);
    const bar = screen.getByRole('progressbar', { name: 'Share of weekly budget used' });
    expect(bar).toHaveAttribute('aria-valuenow', '48');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('always shows a visible text alternative', () => {
    render(<ProgressBar value={48} label="Budget" text="19.2 of 40 kg used (48%)" />);
    expect(screen.getByText('19.2 of 40 kg used (48%)')).toBeInTheDocument();
  });

  it('clamps out-of-range values into 0–100', () => {
    render(<ProgressBar value={250} label="Budget" text="over" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
