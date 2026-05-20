// Enum orderings used for sortable columns. Keeping the rank tables here
// (rather than relying on alphabetical sort of the string values) lets the
// UI sort Status / Priority in their semantic order.
export const STATUS_RANK = { ToDo: 0, InProgress: 1, Done: 2 };
export const PRIORITY_RANK = { Low: 0, Medium: 1, High: 2, Critical: 3 };

const rankers = {
  status: (v) => STATUS_RANK[v] ?? -1,
  priority: (v) => PRIORITY_RANK[v] ?? -1,
};

/**
 * Stable, immutable sort for the tasks table. Returns a new array; never
 * mutates the input (the items come from the Redux store, where mutation
 * would crash dev-mode).
 *
 * @param items   the task DTOs to sort
 * @param key     'status' | 'priority' | null  (null = no sort)
 * @param dir     'asc' | 'desc'
 */
export function sortTasks(items, key, dir = 'asc') {
  if (!key || !items?.length) return items ?? [];
  const ranker = rankers[key];
  if (!ranker) return items;
  const sign = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => sign * (ranker(a[key]) - ranker(b[key])));
}

/** Toggle helper for column headers. */
export function nextSort(current, key) {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return { key: null, dir: 'asc' }; // third click clears
}
