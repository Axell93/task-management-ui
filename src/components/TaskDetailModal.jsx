import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from './Modal';
import Spinner from './Spinner';
import { PriorityBadge, StatusBadge } from './Badge';
import { clearSelected, fetchTaskById, selectTasks } from '../store/tasksSlice';

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <dt className="col-span-1 text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function TaskDetailModal({ open, onClose, taskId }) {
  const dispatch = useDispatch();
  const { selected } = useSelector(selectTasks);

  useEffect(() => {
    if (open && taskId) dispatch(fetchTaskById(taskId));
    if (!open) dispatch(clearSelected());
  }, [open, taskId, dispatch]);

  return (
    <Modal open={open} onClose={onClose} title="Task details" size="md">
      {!selected ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Spinner className="w-6 h-6" />
        </div>
      ) : (
        <dl>
          <Row label="ID">#{selected.id}</Row>
          <Row label="Title">{selected.title}</Row>
          <Row label="Description">
            {selected.description || <span className="text-slate-400">—</span>}
          </Row>
          <Row label="Status">
            <StatusBadge value={selected.status} />
          </Row>
          <Row label="Priority">
            <PriorityBadge value={selected.priority} />
          </Row>
          <Row label="Assigned to">
            {selected.assignedTo || <span className="text-slate-400">—</span>}
          </Row>
          <Row label="Created">{new Date(selected.createdDate).toLocaleString()}</Row>
          <Row label="Modified">{new Date(selected.modifiedDate).toLocaleString()}</Row>
        </dl>
      )}
    </Modal>
  );
}
