// Enum strings the backend returns (System.Text.Json + JsonStringEnumConverter).
export const STATUSES = ['ToDo', 'InProgress', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const STATUS_LABEL = {
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Done: 'Done',
};

export const STATUS_BADGE = {
  ToDo: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-amber-100 text-amber-800',
  Done: 'bg-emerald-100 text-emerald-800',
};

export const PRIORITY_BADGE = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-sky-100 text-sky-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-rose-100 text-rose-800',
};
