import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: Error };

export type AsyncResult<T> = AsyncState<T> & {
  /** Re-runs the loader; used by error-state retry buttons and pull-to-refresh. */
  reload: () => void;
  /** True while a reload is in flight over already-rendered data. */
  isRefreshing: boolean;
};

const LOADING: AsyncState<never> = { status: 'loading', data: undefined, error: undefined };

/**
 * Runs a service call and exposes loading / success / error as one state, so
 * every screen renders the three states the same way.
 *
 * `load` must be stable (declare it outside the component or wrap it in
 * `useCallback`) — it is the effect's dependency.
 */
export function useAsyncData<T>(load: () => Promise<T>): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>(LOADING);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Bumped by `reload` to re-run the effect without changing `load`.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    load().then(
      (data) => {
        if (cancelled) return;
        setState({ status: 'success', data, error: undefined });
        setIsRefreshing(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          data: undefined,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
        setIsRefreshing(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => {
    // Keep rendered data in place and show the refresh affordance; from a
    // loading or error state, fall back to the skeleton instead.
    setState((current) => (current.status === 'success' ? current : LOADING));
    setIsRefreshing(true);
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, reload, isRefreshing };
}
