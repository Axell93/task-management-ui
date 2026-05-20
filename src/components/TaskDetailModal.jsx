import { useCallback } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { PriorityBadge, StatusBadge } from './Badge';
import { tasksApi } from '../api/tasksApi';
import { useFetch } from '../hooks/useFetch';
import { extractError } from '../utils/errors';

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <dt className="col-span-1 text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      {/*
        React renders all children as text by default — XSS-safe.
        Never replace this with dangerouslySetInnerHTML.
      */}
      <dd className="col-span-2 text-sm text-slate-800 break-words">{children}</dd>
    </div>
  );
}

export default function TaskDetailModal({ open, onClose, taskId }) {
  // Bind the request to the modal's lifecycle. useFetch:
  //   • aborts the in-flight call if the modal closes mid-flight
  //   • restarts (with retry) when taskId changes
  //   • drops stale responses if the user opens task A then immediately B
  const fetcher = useCallback((signal) => tasksApi.getById(taskId, signal), [taskId]);
  const { data, error, loading, refetch } = useFetch(fetcher, { immediate: open && !!taskId });

  return (
    <Modal open={open} onClose={onClose} title="Task details" size="md">
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Spinner className="w-6 h-6" />
        </div>
      )}

      {!loading && error && (
        <div className="py-6 text-center">
          <p className="text-sm text-rose-600 mb-3">
            {extractError(error, 'Failed to load task.')}
          </p>
          <button className="btn-secondary" onClick={refetch}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <dl>
          <Row label="ID">#{data.id}</Row>
          <Row label="Title">{data.title}</Row>
          <Row label="Description">
            {data.description || <span className="text-slate-400">—</span>}
          </Row>
          <Row label="Status">
            <StatusBadge value={data.status} />
          </Row>
          <Row label="Priority">
            <PriorityBadge value={data.priority} />
          </Row>
          <Row label="Assigned to">
            {data.assignedTo || <span className="text-slate-400">—</span>}
          </Row>
          <Row label="Created">{new Date(data.createdDate).toLocaleString()}</Row>
          <Row label="Modified">{new Date(data.modifiedDate).toLocaleString()}</Row>
        </dl>
      )}
    </Modal>
  );
}
