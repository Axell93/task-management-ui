import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/authApi', () => ({
  authApi: { login: vi.fn(), register: vi.fn() },
}));

import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';
import reducer, { logout, loginThunk, selectIsAuthenticated } from './authSlice';

const buildStore = () => configureStore({ reducer: { auth: reducer } });

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when no token persisted', () => {
    const store = buildStore();
    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });

  it('login.fulfilled persists token + userName to storage and state', async () => {
    authApi.login.mockResolvedValue({ token: 'tok-xyz', expiresAt: '2099-01-01' });
    const store = buildStore();

    await store.dispatch(loginThunk({ userName: 'alice', password: 'x' }));

    expect(store.getState().auth.token).toBe('tok-xyz');
    expect(store.getState().auth.userName).toBe('alice');
    expect(localStorage.getItem('token')).toBe('tok-xyz');
  });

  it('login.rejected sets error and stays unauthenticated', async () => {
    authApi.login.mockRejectedValue({ response: { data: { detail: 'nope' } } });
    const store = buildStore();

    await store.dispatch(loginThunk({ userName: 'a', password: 'b' }));

    expect(selectIsAuthenticated(store.getState())).toBe(false);
    expect(store.getState().auth.error).toBe('nope');
  });

  it('logout clears state and storage', async () => {
    authApi.login.mockResolvedValue({ token: 't', expiresAt: 'x' });
    const store = buildStore();
    await store.dispatch(loginThunk({ userName: 'a', password: 'b' }));

    store.dispatch(logout());

    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
