import { CATEGORY_IDS, type CategoryId } from './types';
import {
  DATE_FIELDS,
  DATE_RANGES,
  DEFAULT_FILTERS,
  SORTS,
  TABS,
  type DateField,
  type Filters,
  type SortId,
  type TabId,
} from './filters';

export type Route =
  | { name: 'home' }
  | { name: 'repo'; fullName: string }
  | { name: 'about' }
  | { name: 'privacy' };

export interface HashState {
  route: Route;
  filters: Filters;
  demo: boolean;
}

const oneOf = <T extends string | number>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

const REPO_PATH = /^\/repo\/([A-Za-z0-9._-]{1,100})\/([A-Za-z0-9._-]{1,100})\/?$/;

/** Parses "#/repo/owner/name?tab=popular&q=osint" into route + filters. Unknown values fall back to defaults. */
export function parseHash(hash: string): HashState {
  const raw = hash.replace(/^#/, '');
  const [pathPart = '', queryPart = ''] = raw.split('?');
  const path = pathPart || '/';
  const p = new URLSearchParams(queryPart);

  let route: Route = { name: 'home' };
  const m = REPO_PATH.exec(path);
  if (m) route = { name: 'repo', fullName: `${m[1]}/${m[2]}` };
  else if (path === '/about') route = { name: 'about' };
  else if (path === '/privacy') route = { name: 'privacy' };

  const stars = Number(p.get('stars'));
  const days = Number(p.get('days'));
  const filters: Filters = {
    tab: oneOf<TabId>(TABS, p.get('tab'), DEFAULT_FILTERS.tab),
    query: (p.get('q') ?? '').slice(0, 100),
    category: oneOf<CategoryId | 'all'>([...CATEGORY_IDS, 'all'], p.get('cat'), 'all'),
    language: p.get('lang')?.slice(0, 40) || 'all',
    minStars: Number.isFinite(stars) && stars > 0 ? Math.min(Math.trunc(stars), 1_000_000) : 0,
    dateField: oneOf<DateField>(DATE_FIELDS, p.get('date'), DEFAULT_FILTERS.dateField),
    dateRange: oneOf<number>(DATE_RANGES, days, 0),
    sort: oneOf<SortId>(SORTS, p.get('sort'), DEFAULT_FILTERS.sort),
  };
  return { route, filters, demo: p.get('demo') === '1' };
}

export function routePath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'repo':
      return `/repo/${route.fullName}`;
    case 'about':
      return '/about';
    case 'privacy':
      return '/privacy';
  }
}

/** Inverse of parseHash; default values are omitted to keep URLs short and shareable. */
export function buildHash(state: HashState): string {
  const f = state.filters;
  const p = new URLSearchParams();
  if (f.tab !== DEFAULT_FILTERS.tab) p.set('tab', f.tab);
  if (f.query.trim()) p.set('q', f.query.trim());
  if (f.category !== 'all') p.set('cat', f.category);
  if (f.language !== 'all') p.set('lang', f.language);
  if (f.minStars > 0) p.set('stars', String(f.minStars));
  if (f.dateRange > 0) {
    p.set('days', String(f.dateRange));
    if (f.dateField !== DEFAULT_FILTERS.dateField) p.set('date', f.dateField);
  }
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  if (state.demo) p.set('demo', '1');
  const qs = p.toString();
  return `#${routePath(state.route)}${qs ? `?${qs}` : ''}`;
}
