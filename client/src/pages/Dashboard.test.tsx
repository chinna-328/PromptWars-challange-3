import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import type { Summary } from '@shared/types';

const summary: Summary = {
  period: 'week',
  range: { from: '2026-06-08', to: '2026-06-14' },
  totalKg: 26.4,
  previousTotalKg: 30,
  changePct: -12,
  byCategory: [
    { category: 'transport', totalKg: 19.2 },
    { category: 'energy', totalKg: 0 },
    { category: 'food', totalKg: 7.2 },
    { category: 'shopping', totalKg: 0 },
  ],
  trend: Array.from({ length: 8 }, (_, index) => ({
    weekStart: `2026-04-${20 + index}`,
    totalKg: index * 2,
  })),
};

vi.mock('../lib/api', () => ({
  api: { getSummary: vi.fn(() => Promise.resolve(summary)) },
}));

describe('Dashboard', () => {
  it('shows the total, the accessible change text and the top category', async () => {
    render(<Dashboard />);
    const totals = await screen.findByRole('region', { name: 'Totals' });
    expect(within(totals).getByText('26.4 kg CO2e')).toBeInTheDocument();
    expect(within(totals).getByText(/down 12% vs previous period/i)).toBeInTheDocument();
    expect(within(totals).getByText('Transport')).toBeInTheDocument();
  });

  it('renders the breakdown chart with an equivalent data table', async () => {
    render(<Dashboard />);
    const table = (await screen.findByRole('table', {
      name: 'Emissions by category',
    })) as HTMLTableElement;
    expect(within(table).getByRole('rowheader', { name: 'Transport' })).toBeInTheDocument();
    expect(within(table).getByText('19.2 kg CO2e')).toBeInTheDocument();
    // All four categories appear even when zero.
    expect(within(table).getAllByRole('rowheader')).toHaveLength(4);
  });

  it('renders the 8-week trend as a data table', async () => {
    render(<Dashboard />);
    const table = await screen.findByRole('table', { name: 'Weekly emissions, last 8 weeks' });
    expect(within(table).getAllByRole('rowheader')).toHaveLength(8);
  });

  it('lets the user switch periods with labelled radio buttons', async () => {
    const { api } = await import('../lib/api');
    const user = userEvent.setup();
    render(<Dashboard />);
    await screen.findByText('26.4 kg CO2e');
    await user.click(screen.getByRole('radio', { name: 'Today' }));
    expect(api.getSummary).toHaveBeenLastCalledWith('day');
  });
});
