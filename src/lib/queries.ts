import type { CategoryId } from './types';
import { CATEGORY_IDS } from './types';

export type SearchSort = 'stars' | 'updated' | 'forks';

export interface QueryDef {
  id: string;
  category: CategoryId;
  q: string;
  sort?: SearchSort;
  pages?: number;
  trust?: boolean;
}

export interface QueriesConfig {
  baseQualifiers: string;
  defaults: { sort: SearchSort; pages: number };
  queries: QueryDef[];
}

export interface ResolvedQuery {
  id: string;
  category: CategoryId;
  q: string;
  sort: SearchSort;
  pages: number;
  trust: boolean;
}

export const MAX_PAGES = 10;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Replaces {{created:N}} / {{pushed:N}} with absolute dates relative to `now` (UTC). */
export function expandPlaceholders(q: string, now: Date): string {
  return q.replace(/\{\{(created|pushed):(\d{1,4})\}\}/g, (_, field: string, days: string) => {
    const d = new Date(now.getTime() - Number(days) * 86_400_000);
    return `${field}:>=${isoDate(d)}`;
  });
}

export function resolveQueries(config: QueriesConfig, now: Date): ResolvedQuery[] {
  const ids = new Set<string>();
  return config.queries.map((def) => {
    if (ids.has(def.id)) throw new Error(`Duplicate query id: ${def.id}`);
    ids.add(def.id);
    if (!CATEGORY_IDS.includes(def.category)) throw new Error(`Unknown category "${def.category}" in query ${def.id}`);
    const sort = def.sort ?? config.defaults.sort;
    if (!['stars', 'updated', 'forks'].includes(sort)) throw new Error(`Invalid sort "${sort}" in query ${def.id}`);
    const pages = Math.min(MAX_PAGES, Math.max(1, Math.trunc(def.pages ?? config.defaults.pages)));
    const q = `${expandPlaceholders(def.q, now)} ${config.baseQualifiers}`.replace(/\s+/g, ' ').trim();
    if (q.includes('{{')) throw new Error(`Unknown placeholder in query ${def.id}`);
    return { id: def.id, category: def.category, q, sort, pages, trust: Boolean(def.trust) };
  });
}
