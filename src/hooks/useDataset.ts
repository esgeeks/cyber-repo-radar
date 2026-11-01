import { useCallback, useEffect, useState } from 'react';
import { ROOT } from '../lib/paths';
import type { Dataset } from '../lib/types';

export type DatasetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** `complete` is false while only recent.json (last 7 days) is loaded. */
  | { status: 'ready'; data: Dataset; complete: boolean; fullError?: string };

export const REAL_URL = `${ROOT}data/repos.json`;
export const RECENT_URL = `${ROOT}data/recent.json`;
export const DEMO_URL = `${ROOT}data/demo.json`;

export function isDataset(value: unknown): value is Dataset {
  const d = value as Dataset;
  return Boolean(
    d && typeof d === 'object' && d.meta && d.meta.schemaVersion === 1 && typeof d.meta.generatedAt === 'string' && Array.isArray(d.repos),
  );
}

async function load(url: string): Promise<Dataset> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!isDataset(data)) throw new Error('Invalid dataset format');
  return data;
}

/**
 * Loads data in two phases: recent.json (small, last 7 days) for a fast first paint, then the
 * full repos.json in the background. `demo` loads the fictional dataset instead.
 * In development, falls back to the demo dataset if no real data has been generated yet.
 */
export function useDataset(demo: boolean) {
  const [state, setState] = useState<DatasetState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      if (demo) {
        try {
          const data = await load(DEMO_URL);
          if (!cancelled) setState({ status: 'ready', data, complete: true });
        } catch (err) {
          if (!cancelled) setState({ status: 'error', message: (err as Error).message });
        }
        return;
      }

      const full = load(REAL_URL);
      full.catch(() => {}); // handled below
      try {
        const recent = await load(RECENT_URL);
        if (!cancelled && recent.meta.subset) setState({ status: 'ready', data: recent, complete: false });
      } catch {
        /* older deployments have no recent.json: wait for the full file */
      }
      try {
        const data = await full;
        if (!cancelled) setState({ status: 'ready', data, complete: true });
      } catch (err) {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          try {
            const data = await load(DEMO_URL);
            if (!cancelled) setState({ status: 'ready', data, complete: true });
            return;
          } catch {
            /* fall through */
          }
        }
        setState((prev) =>
          // Keep showing the recent subset if only the full file failed.
          prev.status === 'ready'
            ? { ...prev, fullError: (err as Error).message }
            : { status: 'error', message: (err as Error).message },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demo, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
