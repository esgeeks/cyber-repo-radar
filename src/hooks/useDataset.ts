import { useCallback, useEffect, useState } from 'react';
import type { Dataset } from '../lib/types';

export type DatasetState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Dataset };

const base = import.meta.env.BASE_URL;
export const REAL_URL = `${base}data/repos.json`;
export const DEMO_URL = `${base}data/demo.json`;

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
 * Loads the real dataset, or the fictional demo dataset when `demo` is true.
 * In development, falls back to the demo dataset if no real data has been generated yet.
 */
export function useDataset(demo: boolean) {
  const [state, setState] = useState<DatasetState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      try {
        const data = await load(demo ? DEMO_URL : REAL_URL);
        if (!cancelled) setState({ status: 'ready', data });
      } catch (err) {
        if (!demo && import.meta.env.DEV) {
          try {
            const data = await load(DEMO_URL);
            if (!cancelled) setState({ status: 'ready', data });
            return;
          } catch {
            /* fall through */
          }
        }
        if (!cancelled) setState({ status: 'error', message: (err as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demo, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
