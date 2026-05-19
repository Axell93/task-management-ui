import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, selectAuth } from "../store/authSlice";
import {
  bulkSoftDelete,
  fetchTasks,
  selectTasks,
  setFilter,
} from "../store/tasksSlice";
import { PRIORITIES, STATUSES, STATUS_LABEL } from "../utils/constants";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import Spinner from "../components/Spinner";
import TaskFormModal from "../components/TaskFormModal";
import TaskDetailModal from "../components/TaskDetailModal";
import SummaryModal from "../components/SummaryModal";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartIcon,
  LogoutIcon,
} from "../icons";

export default function TasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userName } = useSelector(selectAuth);
  const { items, filters, listStatus, error } = useSelector(selectTasks);
  const loading = listStatus === "loading";

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Re-fetch when filters change. The server does the filtering.
  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);

  // Reset selection when the visible row set changes.
  useEffect(() => {
    const visible = new Set(items.map((t) => t.id));
    setSelectedIds(
      (prev) => new Set([...prev].filter((id) => visible.has(id))),
    );
  }, [items]);

  const allChecked =
    items.length > 0 && items.every((t) => selectedIds.has(t.id));
  const someChecked = selectedIds.size > 0 && !allChecked;

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((t) => t.id)));
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
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Soft-delete ${selectedIds.size} task(s)?`)) return;
    await dispatch(bulkSoftDelete([...selectedIds]));
    setSelectedIds(new Set());
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setFormOpen(true);
  };

  const counters = useMemo(
    () => ({ total: items.length, selected: selectedIds.size }),
    [items.length, selectedIds.size],
  );

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center text-sm font-semibold">
              T
            </div>
            <h1 className="text-base font-semibold text-slate-900">
              Task Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="text-sm text-slate-500 hidden sm:inline">
                Signed in as{" "}
                <span className="text-slate-800 font-medium">{userName}</span>
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
              {counters.total} {counters.total === 1 ? "task" : "tasks"}
              {counters.selected > 0 && (
                <span className="ml-2 text-brand-700">
                  ({counters.selected} selected)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => setSummaryOpen(true)}
            >
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
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                className="input py-1.5 w-40"
                value={filters.status}
                onChange={(e) =>
                  dispatch(setFilter({ status: e.target.value }))
                }
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
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Priority
              </label>
              <select
                className="input py-1.5 w-40"
                value={filters.priority}
                onChange={(e) =>
                  dispatch(setFilter({ priority: e.target.value }))
                }
              >
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {(filters.status || filters.priority) && (
              <button
                className="text-xs text-slate-500 hover:text-slate-700 underline"
                onClick={() =>
                  dispatch(setFilter({ status: "", priority: "" }))
                }
              >
                Clear filters
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button className="btn-danger" onClick={handleBulkDelete}>
                  <TrashIcon />
                  Delete selected
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
                      ref={(el) => el && (el.indeterminate = someChecked)}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Priority
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Assigned
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    Modified
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-slate-600 w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> Loading tasks…
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      No tasks match the current filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  items.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                          aria-label={`Select task ${t.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailId(t.id)}
                          className="font-medium text-slate-900 hover:text-brand-700 text-left"
                        >
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
                        {t.assignedTo || (
                          <span className="text-slate-400">—</span>
                        )}
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

          {error && !loading && (
            <div className="px-4 py-3 border-t border-slate-200 text-sm text-rose-700 bg-rose-50">
              {error}
            </div>
          )}
        </div>
      </main>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        filters={filters}
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
