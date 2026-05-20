import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/tasksApi', () => ({
  tasksApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    summary: vi.fn(),
  },
}));

import { tasksApi } from '../api/tasksApi';
import { renderWithProviders } from '../test/renderWithProviders';
import TasksPage from './TasksPage';

const seed = [
  {
    id: 1,
    title: 'Alpha',
    status: 'ToDo',
    priority: 'High',
    assignedTo: 'a',
    createdDate: '2026-01-01T00:00:00Z',
    modifiedDate: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Beta',
    status: 'InProgress',
    priority: 'Low',
    assignedTo: 'b',
    createdDate: '2026-01-02T00:00:00Z',
    modifiedDate: '2026-01-02T00:00:00Z',
  },
  {
    id: 3,
    title: 'Gamma',
    status: 'Done',
    priority: 'Critical',
    assignedTo: null,
    createdDate: '2026-01-03T00:00:00Z',
    modifiedDate: '2026-01-03T00:00:00Z',
  },
];

const authed = {
  auth: { token: 'tok', userName: 'tester', expiresAt: null, status: 'idle', error: null },
};

describe('<TasksPage /> integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Auto-confirm window.confirm so bulk-delete tests don't hang.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders fetched rows', async () => {
    tasksApi.list.mockResolvedValue(seed);
    renderWithProviders(<TasksPage />, { preloadedState: authed });

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('empty state when API returns no rows', async () => {
    tasksApi.list.mockResolvedValue([]);
    renderWithProviders(<TasksPage />, { preloadedState: authed });

    expect(await screen.findByText(/No tasks match/i)).toBeInTheDocument();
  });

  it('shows error state with a Try again button when the API fails', async () => {
    // 404 is non-transient — useFetch surfaces it immediately without retry.
    tasksApi.list.mockRejectedValue({
      response: { status: 404, data: { detail: 'oh no' } },
    });
    renderWithProviders(<TasksPage />, { preloadedState: authed });

    expect(await screen.findByText('oh no')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });
    tasksApi.list.mockResolvedValue(seed);
    await userEvent.click(retry);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
  });

  it('sorts by Priority semantically (Low < Medium < High < Critical)', async () => {
    tasksApi.list.mockResolvedValue(seed);
    renderWithProviders(<TasksPage />, { preloadedState: authed });
    await screen.findByText('Alpha');

    await userEvent.click(screen.getByRole('button', { name: /Priority/i }));
    const rows = screen.getAllByRole('row').slice(1); // skip header
    // First column (after checkbox) shows the title — assert order by title.
    expect(within(rows[0]).getByText('Beta')).toBeInTheDocument(); // Low
    expect(within(rows[1]).getByText('Alpha')).toBeInTheDocument(); // High
    expect(within(rows[2]).getByText('Gamma')).toBeInTheDocument(); // Critical
  });

  it('toggles sort to descending on second click and back to none on third', async () => {
    tasksApi.list.mockResolvedValue(seed);
    renderWithProviders(<TasksPage />, { preloadedState: authed });
    await screen.findByText('Alpha');

    const header = screen.getByRole('button', { name: /Status/i });
    await userEvent.click(header); // asc
    let th = header.closest('th');
    expect(th).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(header); // desc
    expect(th).toHaveAttribute('aria-sort', 'descending');
    await userEvent.click(header); // cleared
    expect(th).toHaveAttribute('aria-sort', 'none');
  });

  it('bulk-deletes selected rows after user confirms (then refetches)', async () => {
    // Initial list = seed; after delete, refetch returns only the un-deleted row.
    tasksApi.list.mockResolvedValueOnce(seed).mockResolvedValueOnce([seed[2]]);
    tasksApi.softDelete.mockResolvedValue({ affected: 2 });

    renderWithProviders(<TasksPage />, { preloadedState: authed });
    await screen.findByText('Alpha');

    await userEvent.click(screen.getByLabelText('Select task 1'));
    await userEvent.click(screen.getByLabelText('Select task 2'));
    await userEvent.click(screen.getByRole('button', { name: /Delete selected/i }));

    await waitFor(() => {
      expect(tasksApi.softDelete).toHaveBeenCalledWith([1, 2]);
    });
    // useFetch's refetch fires after the delete resolves.
    await waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('re-fetches when a filter changes (useFetch refires)', async () => {
    tasksApi.list.mockResolvedValue(seed);
    renderWithProviders(<TasksPage />, { preloadedState: authed });
    await screen.findByText('Alpha');

    // Status filter is the first <select>; Priority is the second.
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'Done');

    await waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(2));
    // Latest call uses the new filter values; the AbortSignal is the 2nd arg.
    expect(tasksApi.list.mock.lastCall[0]).toMatchObject({ status: 'Done' });
    expect(tasksApi.list.mock.lastCall[1]).toBeInstanceOf(AbortSignal);
  });
});
