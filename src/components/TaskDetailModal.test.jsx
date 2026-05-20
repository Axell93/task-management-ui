import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/tasksApi', () => ({
  tasksApi: { getById: vi.fn() },
}));

import { tasksApi } from '../api/tasksApi';
import { renderWithProviders } from '../test/renderWithProviders';
import TaskDetailModal from './TaskDetailModal';

const task = {
  id: 42,
  title: 'My task',
  description: 'desc',
  status: 'InProgress',
  priority: 'High',
  assignedTo: 'alice',
  createdDate: '2026-01-01T00:00:00Z',
  modifiedDate: '2026-01-02T00:00:00Z',
};

describe('<TaskDetailModal />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and renders the task when opened', async () => {
    tasksApi.getById.mockResolvedValue(task);
    renderWithProviders(<TaskDetailModal open={true} onClose={() => {}} taskId={42} />);

    expect(await screen.findByText('My task')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(tasksApi.getById).toHaveBeenCalledWith(42, expect.any(AbortSignal));
  });

  it('shows a retry button on error and recovers on click', async () => {
    // 404 isn't transient — useFetch will NOT auto-retry, so the error
    // surfaces immediately for the user to act on.
    tasksApi.getById.mockRejectedValue({
      response: { status: 404, data: { detail: 'down' } },
    });
    renderWithProviders(<TaskDetailModal open={true} onClose={() => {}} taskId={42} />);

    expect(await screen.findByText('down')).toBeInTheDocument();
    tasksApi.getById.mockResolvedValue(task);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('My task')).toBeInTheDocument();
  });

  it('does NOT fetch when closed (no wasted call)', () => {
    renderWithProviders(<TaskDetailModal open={false} onClose={() => {}} taskId={42} />);
    expect(tasksApi.getById).not.toHaveBeenCalled();
  });

  it('aborts the in-flight call when unmounted (no stale state)', async () => {
    let observedSignal;
    tasksApi.getById.mockImplementation(
      (_, signal) =>
        new Promise((_resolve, reject) => {
          observedSignal = signal;
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const { unmount } = renderWithProviders(
      <TaskDetailModal open={true} onClose={() => {}} taskId={42} />,
    );

    await waitFor(() => expect(observedSignal).toBeDefined());
    unmount();
    expect(observedSignal.aborted).toBe(true);
  });
});
