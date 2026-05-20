import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, selectAuth } from '../store/authSlice';
import { tasksApi } from '../api/tasksApi';
import { useFetch } from '../hooks/useFetch';
import { extractError } from '../utils/errors';
import { PRIORITIES, STATUSES, STATUS_LABEL } from '../utils/constants';
import { nextSort, sortTasks } from '../utils/sort';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import Spinner from '../components/Spinner';
import TaskFormModal from '../components/TaskFormModal';
import TaskDetailModal from '../components/TaskDetailModal';
import SummaryModal from '../components/SummaryModal';
import { ChartIcon, LogoutIcon, PencilIcon, PlusIcon, TrashIcon } from '../icons';

export default function TasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userName } = useSelector(selectAuth);

  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  // ──────────────────────────────────────────────────────────────────────
  // List fetch via useFetch.
  //
  // The fetcher's identity changes only when `filters` change, so useFetch
  // automatically:
  //   • aborts the in-flight request if filters change before the response
  //     arrives (race-condition guard),
  //   • retries transient errors (network / 5xx / 429) with backoff,
  //   • discards stale responses via its sequence counter, and
  //   • cleans up on unmount.
  // ──────────────────────────────────────────────────────────────────────
  const listFetcher = useCallback((signal) => tasksApi.list(filters, signal), [filters]);
  const { data, error: fetchError, loading, refetch } = useFetch(listFetcher);

  // Visible rows = server-filtered items, optionally sorted client-side.
  const visibleItems = useMemo(() => sortTasks(data ?? [], sort.key, sort.dir), [data, sort]);

  // Derive the effective selection at render time instead of pruning state
  // in an effect — avoids the cascading-render anti-pattern flagged by
  // react-hooks. Selecting a row that later disappears is silently dropped.
  const visibleIdSet = useMemo(() => new Set(visibleItems.map((t) => t.id)), [visibleItems]);
  const effectiveSelectedIds = useMemo(
    () => new Set([...selectedIds].filter((id) => visibleIdSet.has(id))),
    [selectedIds, visibleIdSet],
  );

  const allChecked =
    visibleItems.length > 0 && visibleItems.every((t) => effectiveSelectedIds.has(t.id));
  const someChecked = effectiveSelectedIds.size > 0 && !allChecked;

  // Indeterminate is a DOM-only property (not a React prop). Apply via ref
  // in an effect so the change happens after commit, not during render.
  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleItems.map((t) => t.id)));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (effectiveSelectedIds.size === 0) return;
    if (!window.confirm(`Soft-delete ${effectiveSelectedIds.size} task(s)?`)) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      await tasksApi.softDelete([...effectiveSelectedIds]);
      setSelectedIds(new Set());
      refetch();
    } catch (e) {
      setBulkError(extractError(e, 'Failed to delete tasks.'));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setFormOpen(true);
  };

  const onSort = (key) => setSort((cur) => nextSort(cur, key));

  const counters = useMemo(
    () => ({ total: visibleItems.length, selected: effectiveSelectedIds.size }),
    [visibleItems.length, effectiveSelectedIds.size],
  );

  const errorMessage =
    bulkError || (fetchError ? extractError(fetchError, 'Failed to load tasks.') : null);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center text-sm font-semibold">
              T
            </div>
            <h1 className="text-base font-semibold text-slate-900">Task Management</h1>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-sm text-slate-500 hidden sm:inline">
                Signed in as <span className="text-slate-800 font-medium">{userName}</span>
              </span>
            )}
            <button onClick={handleLogout} className="btn-secondary">
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
            <p className="text-sm text-slate-500">
              {counters.total} {counters.total === 1 ? 'task' : 'tasks'}
              {counters.selected > 0 && (
                <span className="ml-2 text-brand-700">({counters.selected} selected)</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={() => setSummaryOpen(true)}>
              <ChartIcon />
              View summary
            </button>
            <button className="btn-primary" onClick={openCreate}>
              <PlusIcon />
              Create task
            </button>
          </div>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Status</label>
              <select
                className="input py-1.5 w-40"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Priority</label>
              <select
                className="input py-1.5 w-40"
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {(filters.status || filters.priority || sort.key) && (
              <button
                className="text-xs text-slate-500 hover:text-slate-700 underline"
                onClick={() => {
                  setFilters({ status: '', priority: '' });
                  setSort({ key: null, dir: 'asc' });
                }}
              >
                Clear filters
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {effectiveSelectedIds.size > 0 && (
                <button className="btn-danger" onClick={handleBulkDelete} disabled={bulkBusy}>
                  <TrashIcon />
                  {bulkBusy ? 'Deleting…' : 'Delete selected'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                      checked={allChecked}
                      ref={selectAllRef}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Title</th>
                  <SortableHeader label="Status" col="status" sort={sort} onSort={onSort} />
                  <SortableHeader label="Priority" col="priority" sort={sort} onSort={onSort} />
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Assigned</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">Modified</th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-600 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> Loading tasks…
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && errorMessage && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <p className="text-sm text-rose-600 mb-2">{errorMessage}</p>
                      <button className="btn-secondary" onClick={refetch}>
                        Try again
                      </button>
                    </td>
                  </tr>
                )}
                {!loading && !errorMessage && visibleItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No tasks match the current filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  !errorMessage &&
                  visibleItems.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                          checked={effectiveSelectedIds.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                          aria-label={`Select task ${t.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailId(t.id)}
                          className="font-medium text-slate-900 hover:text-brand-700 text-left"
                        >
                          {/* Rendered as text — XSS-safe. Never use dangerouslySetInnerHTML here. */}
                          {t.title}
                        </button>
                        <div className="text-xs text-slate-500">#{t.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge value={t.priority} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {t.assignedTo || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">
                        {new Date(t.modifiedDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-slate-400 hover:text-brand-700 p-1"
                          onClick={() => openEdit(t)}
                          aria-label={`Edit task ${t.id}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={refetch}
      />
      <TaskDetailModal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        taskId={detailId}
      />
      <SummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}

function SortableHeader({ label, col, sort, onSort }) {
  const active = sort.key === col;
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th
      className="px-4 py-2.5 text-left font-medium text-slate-600"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <span className={`text-[10px] ${active ? 'text-brand-700' : 'text-slate-300'}`}>
          {arrow}
        </span>
      </button>
    </th>
  );
}
