import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * useFetch — generic data-fetching hook with:
 *   • AbortController bound to component lifecycle (prevents stale updates)
 *   • Bounded retry with exponential backoff + jitter (transient errors only)
 *   • Sequence guard so out-of-order responses can't overwrite newer state
 *   • Manual refetch() for "try again" UX
 *
 * The `fetcher` is a function `(signal) => Promise<T>` — pass a closure that
 * calls axios/fetch with the supplied AbortSignal. Wrap it in useCallback
 * so its identity is stable; otherwise pass `deps` and we'll wrap it for you.
 */

const initial = { data: null, error: null, loading: false, attempt: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true, error: null, attempt: action.attempt };
    case 'success':
      return { data: action.data, error: null, loading: false, attempt: 0 };
    case 'failure':
      return { ...state, loading: false, error: action.error };
    case 'reset':
      return initial;
    default:
      return state;
  }
}

function isTransient(err) {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'CanceledError') return false;
  if (err.code === 'ECONNABORTED' || err.message === 'Network Error') return true;
  const status = err.response?.status;
  if (!status) return true;
  return status >= 500 || status === 429;
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true },
    );
  });

export function useFetch(fetcher, { immediate = true, retries = 2, baseDelayMs = 300 } = {}) {
  const [state, dispatch] = useReducer(reducer, initial);

  // Track the latest request id; ignore responses from older runs.
  // This guards against e.g. the user typing fast in a filter input —
  // only the freshest fetch is allowed to write into state.
  const requestSeq = useRef(0);
  // Hold the active controller so refetch() can cancel any in-flight one.
  const activeCtrl = useRef(null);

  const run = useCallback(async () => {
    const seq = ++requestSeq.current;
    activeCtrl.current?.abort();
    const ctrl = new AbortController();
    activeCtrl.current = ctrl;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (ctrl.signal.aborted) return;
      dispatch({ type: 'start', attempt });
      try {
        const result = await fetcher(ctrl.signal);
        // Stale-update guard: another run started while we awaited.
        if (seq !== requestSeq.current) return;
        dispatch({ type: 'success', data: result });
        return;
      } catch (err) {
        // Caller-driven abort — stay silent.
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
        if (seq !== requestSeq.current) return;

        if (attempt < retries && isTransient(err)) {
          const delay = Math.floor(Math.random() * baseDelayMs * 2 ** attempt);
          try {
            await sleep(delay, ctrl.signal);
          } catch {
            return; // aborted during backoff
          }
          continue;
        }
        dispatch({ type: 'failure', error: err });
        return;
      }
    }
  }, [fetcher, retries, baseDelayMs]);

  useEffect(() => {
    if (!immediate) return undefined;
    run();
    return () => {
      activeCtrl.current?.abort();
    };
  }, [immediate, run]);

  const cancel = useCallback(() => activeCtrl.current?.abort(), []);
  const reset = useCallback(() => {
    cancel();
    dispatch({ type: 'reset' });
  }, [cancel]);

  return { ...state, refetch: run, cancel, reset };
}
