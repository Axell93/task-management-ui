import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from './Modal';
import Spinner from './Spinner';
import { PRIORITIES, STATUSES, STATUS_LABEL } from '../utils/constants';
import { tasksApi } from '../api/tasksApi';
import { extractError } from '../utils/errors';

const empty = {
  title: '',
  description: '',
  status: 'ToDo',
  priority: 'Medium',
  assignedTo: '',
};

export default function TaskFormModal({ open, onClose, editing, onSaved }) {
  const isEdit = Boolean(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: empty });

  // Reset the form whenever we (re-)open the modal so create / edit
  // flows don't bleed into each other. The error is cleared by close()
  // and by the next submit, so we don't need a setState here.
  useEffect(() => {
    if (open) reset(editing ? { ...editing } : empty);
  }, [open, editing, reset]);

  const close = () => {
    if (submitting) return; // never close mid-flight
    setError(null);
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status,
      priority: data.priority,
      assignedTo: data.assignedTo?.trim() || null,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await tasksApi.update(editing.id, payload);
      } else {
        // A fresh UUID is generated inside tasksApi.create as the
        // Idempotency-Key — duplicate submits are safe.
        await tasksApi.create(payload);
      }
      onSaved?.(); // parent re-fetches via useFetch.refetch
      onClose();
    } catch (e) {
      setError(extractError(e, isEdit ? 'Failed to update task.' : 'Failed to create task.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'Edit task' : 'New task'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={submitting}
            className="btn-primary min-w-[110px]"
          >
            {submitting && <Spinner />}
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            {...register('title', {
              required: 'Title is required',
              maxLength: { value: 200, message: 'Max 200 characters' },
            })}
          />
          {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input resize-none"
            {...register('description', {
              maxLength: { value: 2000, message: 'Max 2000 characters' },
            })}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Assigned to</label>
          <input
            className="input"
            placeholder="username"
            {...register('assignedTo', {
              maxLength: { value: 200, message: 'Max 200 characters' },
            })}
          />
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
