import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../api/authApi";
import { extractError } from "../utils/errors";

// Thunks (Redux Toolkit ships with redux-thunk; createAsyncThunk uses it).
export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.login(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Login failed."));
    }
  },
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.register(payload);
    } catch (err) {
      return rejectWithValue(extractError(err, "Registration failed."));
    }
  },
);

const initial = {
  token: localStorage.getItem("token") || null,
  expiresAt: localStorage.getItem("expiresAt") || null,
  userName: localStorage.getItem("userName") || null,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initial,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.expiresAt = null;
      state.userName = null;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.removeItem("expiresAt");
      localStorage.removeItem("userName");
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const onPending = (state) => {
      state.status = "loading";
      state.error = null;
    };
    const onFulfilled = (state, action) => {
      state.status = "succeeded";
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.userName = action.meta.arg.userName;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("expiresAt", action.payload.expiresAt);
      localStorage.setItem("userName", action.meta.arg.userName);
    };
    const onRejected = (state, action) => {
      state.status = "failed";
      state.error = action.payload || action.error?.message || "Auth failed.";
    };
    builder
      .addCase(loginThunk.pending, onPending)
      .addCase(loginThunk.fulfilled, onFulfilled)
      .addCase(loginThunk.rejected, onRejected)
      .addCase(registerThunk.pending, onPending)
      .addCase(registerThunk.fulfilled, onFulfilled)
      .addCase(registerThunk.rejected, onRejected);
  },
});

export const { logout, clearError } = authSlice.actions;
export const selectIsAuthenticated = (s) => Boolean(s.auth.token);
export const selectAuth = (s) => s.auth;
export default authSlice.reducer;
