import { PRIORITY_BADGE, STATUS_BADGE, STATUS_LABEL } from '../utils/constants';

export function StatusBadge({ value }) {
  return (
    <span className={`badge ${STATUS_BADGE[value] || 'bg-slate-100 text-slate-700'}`}>
      {STATUS_LABEL[value] || value}
    </span>
  );
}

export function PriorityBadge({ value }) {
  return (
    <span className={`badge ${PRIORITY_BADGE[value] || 'bg-slate-100 text-slate-700'}`}>
      {value}
    </span>
  );
}
