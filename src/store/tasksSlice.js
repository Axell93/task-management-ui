import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tasksApi } from "../api/tasksApi";
import { extractError } from "../utils/errors";

export const fetchTasks = createAsyncThunk(
  "tasks/fetch",
  async (filters, { rejectWithValue }) => {
    try {
      return await tasksApi.list(filters);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load tasks."));
    }
  },
);

export const fetchTaskById = createAsyncThunk(
  "tasks/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      return await tasksApi.getById(id);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load task."));
    }
  },
);

export const createTask = createAsyncThunk(
  "tasks/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await tasksApi.create(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to create task."));
    }
  },
);

export const updateTask = createAsyncThunk(
  "tasks/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await tasksApi.update(id, payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to update task."));
    }
  },
);

export const bulkSoftDelete = createAsyncThunk(
  "tasks/bulkDelete",
  async (ids, { rejectWithValue }) => {
    try {
      const res = await tasksApi.softDelete(ids);
      return { ids, affected: res.affected };
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to delete tasks."));
    }
  },
);

export const fetchSummary = createAsyncThunk(
  "tasks/summary",
  async (_, { rejectWithValue }) => {
    try {
      return await tasksApi.summary();
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to load summary."));
    }
  },
);

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    items: [],
    selected: null,
    summary: [],
    filters: { status: "", priority: "" },
    listStatus: "idle",
    saveStatus: "idle",
    error: null,
  },
  reducers: {
    setFilter: (state, { payload }) => {
      state.filters = { ...state.filters, ...payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSelected: (state) => {
      state.selected = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchTasks.pending, (s) => {
      s.listStatus = "loading";
      s.error = null;
    })
      .addCase(fetchTasks.fulfilled, (s, a) => {
        s.listStatus = "succeeded";
        s.items = a.payload;
      })
      .addCase(fetchTasks.rejected, (s, a) => {
        s.listStatus = "failed";
        s.error = a.payload || "Failed to load tasks.";
      })
      .addCase(fetchTaskById.fulfilled, (s, a) => {
        s.selected = a.payload;
      })
      .addCase(createTask.pending, (s) => {
        s.saveStatus = "loading";
      })
      .addCase(createTask.fulfilled, (s, a) => {
        s.saveStatus = "succeeded";
        // Insert if new; replace if idempotent-replay returned an existing row.
        const idx = s.items.findIndex((t) => t.id === a.payload.id);
        if (idx >= 0) s.items[idx] = a.payload;
        else s.items.unshift(a.payload);
      })
      .addCase(createTask.rejected, (s, a) => {
        s.saveStatus = "failed";
        s.error = a.payload || "Failed to create task.";
      })
      .addCase(updateTask.fulfilled, (s, a) => {
        const idx = s.items.findIndex((t) => t.id === a.payload.id);
        if (idx >= 0) s.items[idx] = a.payload;
      })
      .addCase(bulkSoftDelete.fulfilled, (s, a) => {
        const ids = new Set(a.payload.ids);
        s.items = s.items.filter((t) => !ids.has(t.id));
      })
      .addCase(fetchSummary.fulfilled, (s, a) => {
        s.summary = a.payload;
      });
  },
});

export const { setFilter, clearError, clearSelected } = tasksSlice.actions;
export const selectTasks = (s) => s.tasks;
export default tasksSlice.reducer;
