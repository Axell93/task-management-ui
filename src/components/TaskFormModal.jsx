import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { PRIORITIES, STATUSES, STATUS_LABEL } from "../utils/constants";
import {
  createTask,
  fetchTasks,
  selectTasks,
  updateTask,
} from "../store/tasksSlice";

const empty = {
  title: "",
  description: "",
  status: "ToDo",
  priority: "Medium",
  assignedTo: "",
};

export default function TaskFormModal({ open, onClose, editing, filters }) {
  const dispatch = useDispatch();
  const { mutationStatus, error } = useSelector(selectTasks);
  const isEdit = Boolean(editing);
  const loading = mutationStatus === "loading";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: empty });

  useEffect(() => {
    if (open) reset(editing ? { ...editing } : empty);
  }, [open, editing, reset]);

  const onSubmit = async (data) => {
    const payload = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status,
      priority: data.priority,
      assignedTo: data.assignedTo?.trim() || null,
    };
    const action = isEdit
      ? updateTask({ id: editing.id, payload })
      : createTask(payload);
    const result = await dispatch(action);
    if (!result.error) {
      onClose();
      dispatch(fetchTasks(filters));
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={isEdit ? "Edit task" : "New task"}
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={loading}
            className="btn-primary min-w-[110px]"
          >
            {loading && <Spinner />}
            {isEdit ? "Save changes" : "Create task"}
          </button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div>
          <label className="label">Title *</label>
          <input
            className="input"
            {...register("title", {
              required: "Title is required",
              maxLength: { value: 200, message: "Max 200 characters" },
            })}
          />
          {errors.title && (
            <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input resize-none"
            {...register("description", {
              maxLength: { value: 2000, message: "Max 2000 characters" },
            })}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" {...register("priority")}>
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
            {...register("assignedTo", {
              maxLength: { value: 200, message: "Max 200 characters" },
            })}
          />
        </div>

        {error && !loading && (
          <div className="rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
