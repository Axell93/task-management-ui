import { useCallback, useMemo } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { PriorityBadge, StatusBadge } from './Badge';
import { tasksApi } from '../api/tasksApi';
import { useFetch } from '../hooks/useFetch';
import { extractError } from '../utils/errors';

export default function SummaryModal({ open, onClose }) {
  const fetcher = useCallback((signal) => tasksApi.summary(signal), []);
  const { data: summary, error, loading, refetch } = useFetch(fetcher, { immediate: open });

  const total = useMemo(() => (summary || []).reduce((sum, r) => sum + r.count, 0), [summary]);

  return (
    <Modal open={open} onClose={onClose} title="Task summary" size="lg">
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Spinner className="w-6 h-6" />
        </div>
      )}

      {!loading && error && (
        <div className="py-6 text-center">
          <p className="text-sm text-rose-600 mb-3">
            {extractError(error, 'Failed to load summary.')}
          </p>
          <button className="btn-secondary" onClick={refetch}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && summary && summary.length === 0 && (
        <p className="text-center text-slate-400 py-8">No data to summarise yet.</p>
      )}

      {!loading && !error && summary && summary.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-sm text-slate-500">
              Counts grouped by status and priority (raw SQL).
            </p>
            <span className="text-sm text-slate-700">
              Total active: <span className="font-semibold">{total}</span>
            </span>
          </div>
          <div className="overflow-hidden border border-slate-200 rounded-md">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Priority</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-4 py-2">
                      <PriorityBadge value={row.priority} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
