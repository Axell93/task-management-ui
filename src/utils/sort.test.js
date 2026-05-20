import { describe, expect, it } from 'vitest';
import { nextSort, sortTasks } from './sort';

const tasks = [
  { id: 1, status: 'Done', priority: 'Low' },
  { id: 2, status: 'ToDo', priority: 'Critical' },
  { id: 3, status: 'InProgress', priority: 'High' },
  { id: 4, status: 'ToDo', priority: 'Medium' },
];

describe('sortTasks', () => {
  it('returns the input unchanged when no key supplied', () => {
    expect(sortTasks(tasks, null).map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });

  it('sorts by status semantic order ascending', () => {
    expect(sortTasks(tasks, 'status', 'asc').map((t) => t.status)).toEqual([
      'ToDo',
      'ToDo',
      'InProgress',
      'Done',
    ]);
  });

  it('sorts by priority descending', () => {
    expect(sortTasks(tasks, 'priority', 'desc').map((t) => t.priority)).toEqual([
      'Critical',
      'High',
      'Medium',
      'Low',
    ]);
  });

  it('does not mutate the input array', () => {
    const ids = tasks.map((t) => t.id);
    sortTasks(tasks, 'status', 'desc');
    expect(tasks.map((t) => t.id)).toEqual(ids);
  });

  it('handles empty / nullish input', () => {
    expect(sortTasks([], 'status')).toEqual([]);
    expect(sortTasks(null, 'status')).toEqual([]);
  });

  it('ignores unknown sort keys', () => {
    expect(sortTasks(tasks, 'foo').map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('nextSort toggle', () => {
  it('first click → asc', () => {
    expect(nextSort(null, 'status')).toEqual({ key: 'status', dir: 'asc' });
  });

  it('second click on same column → desc', () => {
    expect(nextSort({ key: 'status', dir: 'asc' }, 'status')).toEqual({
      key: 'status',
      dir: 'desc',
    });
  });

  it('third click clears the sort', () => {
    expect(nextSort({ key: 'status', dir: 'desc' }, 'status')).toEqual({
      key: null,
      dir: 'asc',
    });
  });

  it('clicking a different column starts at asc', () => {
    expect(nextSort({ key: 'status', dir: 'desc' }, 'priority')).toEqual({
      key: 'priority',
      dir: 'asc',
    });
  });
});
