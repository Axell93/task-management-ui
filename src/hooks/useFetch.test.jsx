import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFetch } from './useFetch';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useFetch', () => {
  it('resolves with data on success', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors then succeeds', async () => {
    const transient = Object.assign(new Error('Network Error'), { message: 'Network Error' });
    const fetcher = vi.fn().mockRejectedValueOnce(transient).mockResolvedValueOnce('payload');

    const { result } = renderHook(() => useFetch(fetcher, { retries: 2, baseDelayMs: 1 }));

    await waitFor(() => expect(result.current.data).toBe('payload'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on a 4xx (non-transient)', async () => {
    const badRequest = Object.assign(new Error('400'), { response: { status: 400 } });
    const fetcher = vi.fn().mockRejectedValue(badRequest);

    const { result } = renderHook(() => useFetch(fetcher, { retries: 3, baseDelayMs: 1 }));

    await waitFor(() => expect(result.current.error).toBe(badRequest));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aborts in-flight request on unmount (no stale state write)', async () => {
    let observedSignal;
    const fetcher = vi.fn(
      (signal) =>
        new Promise((_, reject) => {
          observedSignal = signal;
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const { unmount } = renderHook(() => useFetch(fetcher));
    await flush();
    unmount();
    expect(observedSignal.aborted).toBe(true);
  });

  it('refetch supersedes an in-flight request (stale-update guard)', async () => {
    let resolveFirst;
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => new Promise((res) => (resolveFirst = res)))
      .mockResolvedValueOnce('second');

    const { result } = renderHook(() => useFetch(fetcher));
    await flush();

    // Kick off a second run before resolving the first.
    act(() => {
      result.current.refetch();
    });

    // Now resolve the first promise — the result must be ignored.
    act(() => resolveFirst('first'));
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.data).not.toBe('first');
  });
});
