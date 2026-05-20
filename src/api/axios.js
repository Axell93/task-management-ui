import axios from 'axios';
import { isTokenExpired } from '../utils/jwt';
import { authStorage } from '../utils/storage';

// Same-origin via Vite proxy in dev. In prod, set VITE_API_BASE_URL.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Retry policy — bounded, exponential backoff with jitter. Only retry
// requests that are SAFE to repeat (idempotent verbs + the explicit
// Idempotency-Key on POST) and only on transient errors (network, 5xx, 429).
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 300;

const isIdempotent = (cfg) => {
  const m = (cfg.method || 'get').toLowerCase();
  if (m === 'get' || m === 'head' || m === 'options' || m === 'put' || m === 'delete') return true;
  // POST is only safe to retry when the caller supplied an Idempotency-Key
  // (the API enforces uniqueness, so retries return the original row).
  return m === 'post' && Boolean(cfg.headers?.['Idempotency-Key']);
};

const isTransient = (err) => {
  if (err.code === 'ECONNABORTED' || err.message === 'Network Error') return true;
  const status = err.response?.status;
  if (!status) return true;
  return status >= 500 || status === 429;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Outgoing — attach bearer; if token is already expired, short-circuit
// with a synthetic 401 so we don't waste a round-trip.
http.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    if (isTokenExpired(token)) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { reason: 'expired' } }));
      // Cancel via Axios's CanceledError so the caller sees a normal abort.
      const ctrl = new AbortController();
      ctrl.abort(new DOMException('Token expired', 'AbortError'));
      config.signal = ctrl.signal;
      return config;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.__retryCount = config.__retryCount ?? 0;
  return config;
});

// Incoming — retry transient failures on safe methods; on 401 wipe local
// auth state and broadcast so the app can redirect to /login.
http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const config = err.config;

    if (config && isIdempotent(config) && isTransient(err) && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      // Exponential backoff with full jitter — RFC-style.
      const delay = Math.floor(Math.random() * BASE_DELAY_MS * 2 ** config.__retryCount);
      await sleep(delay);
      return http.request(config);
    }

    if (err.response?.status === 401) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { reason: '401' } }));
    }
    return Promise.reject(err);
  },
);

export default http;
