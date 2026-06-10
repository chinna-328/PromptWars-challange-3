import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityForm } from './ActivityForm';
import { todayISO } from '@shared/dates';

const jsonResponse = (body: unknown, status = 201): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ActivityForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders every control with a programmatic label', () => {
    render(<ActivityForm onSaved={() => undefined} />);
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Activity')).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log activity' })).toBeInTheDocument();
  });

  it('filters activity options when the category changes', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSaved={() => undefined} />);
    await user.selectOptions(screen.getByLabelText('Category'), 'food');
    const options = screen
      .getAllByRole('option')
      .map((option) => option.textContent)
      .filter((text) => text?.startsWith('Meal'));
    expect(options.length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole('option', { name: 'Car (petrol)' })).not.toBeInTheDocument();
  });

  it('submits the activity and announces the logged emissions politely', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 1,
        category: 'transport',
        activityType: 'car_petrol',
        quantity: 20,
        emissionsKg: 3.84,
        date: todayISO(),
        note: null,
        createdAt: 'now',
      }),
    );
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ActivityForm onSaved={onSaved} />);

    await user.type(screen.getByLabelText(/quantity/i), '20');
    await user.click(screen.getByRole('button', { name: 'Log activity' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/activities',
      expect.objectContaining({ method: 'POST' }),
    );
    const sentBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sentBody).toMatchObject({ activityType: 'car_petrol', quantity: 20 });
    // Emissions are never sent by the client — server computes them.
    expect(sentBody).not.toHaveProperty('emissionsKg');

    expect(await screen.findByRole('status')).toHaveTextContent('+3.8 kg CO2e logged');
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('shows an inline error for a non-positive quantity without calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(<ActivityForm onSaved={() => undefined} />);

    await user.type(screen.getByLabelText(/quantity/i), '0');
    await user.click(screen.getByRole('button', { name: 'Log activity' }));

    const input = screen.getByLabelText(/quantity/i);
    expect(input).toHaveAccessibleDescription('Enter a quantity greater than zero.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the server validation message when the API rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'date: cannot be future' } }, 400),
    );
    const user = userEvent.setup();
    render(<ActivityForm onSaved={() => undefined} />);

    await user.type(screen.getByLabelText(/quantity/i), '5');
    await user.click(screen.getByRole('button', { name: 'Log activity' }));

    expect(await screen.findByRole('status')).toHaveTextContent('date: cannot be future');
  });
});
