import type { CategoryId, Repo } from './types';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export const TABS = ['new24h', 'week', 'month', 'popular', 'updated', 'favorites'] as const;
export type TabId = (typeof TABS)[number];

export const SORTS = ['default', 'stars', 'newest', 'pushed', 'forks', 'name'] as const;
export type SortId = (typeof SORTS)[number];

export const DATE_FIELDS = ['created', 'pushed'] as const;
export type DateField = (typeof DATE_FIELDS)[number];

export const DATE_RANGES = [0, 1, 7, 30, 90] as const;
export const STAR_STEPS = [0, 5, 10, 50, 100, 500, 1000] as const;

/** Repos in "Popular" must have been created within this window (recent discoveries, not all-time classics). */
export const POPULAR_WINDOW_DAYS = 90;
export const POPULAR_MIN_STARS = 5;

export interface Filters {
  tab: TabId;
  query: string;
  category: CategoryId | 'all';
  language: string | 'all';
  minStars: number;
  dateField: DateField;
  /** Days back from the reference time; 0 = any date. */
  dateRange: number;
  sort: SortId;
}

export const DEFAULT_FILTERS: Filters = {
  tab: 'week',
  query: '',
  category: 'all',
  language: 'all',
  minStars: 0,
  dateField: 'created',
  dateRange: 0,
  sort: 'default',
};

const ageMs = (iso: string, now: number) => now - new Date(iso).getTime();

/** Whether a repo belongs to a tab. `now` is the dataset reference time (its generation time). */
export function inTab(repo: Repo, tab: TabId, now: number, favorites: ReadonlySet<string> = new Set()): boolean {
  switch (tab) {
    case 'new24h':
      return ageMs(repo.createdAt, now) <= DAY;
    case 'week':
      return ageMs(repo.createdAt, now) <= 7 * DAY;
    case 'month':
      return ageMs(repo.createdAt, now) <= 30 * DAY;
    case 'popular':
      return ageMs(repo.createdAt, now) <= POPULAR_WINDOW_DAYS * DAY && repo.stars >= POPULAR_MIN_STARS;
    case 'updated':
      return ageMs(repo.pushedAt, now) <= 7 * DAY;
    case 'favorites':
      return favorites.has(repo.fullName);
  }
}

export function defaultSortForTab(tab: TabId): Exclude<SortId, 'default'> {
  switch (tab) {
    case 'popular':
      return 'stars';
    case 'updated':
      return 'pushed';
    default:
      return 'newest';
  }
}

/** Lowercase, strip accents, collapse whitespace. */
export function normalizeQuery(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every search term must appear in the name, owner, description or topics. */
export function matchesQuery(repo: Repo, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = normalizeQuery(`${repo.fullName} ${repo.name.replace(/[-_.]/g, ' ')} ${repo.description ?? ''} ${repo.topics.join(' ')}`);
  return q.split(' ').every((term) => haystack.includes(term));
}

export function applyFilters(repos: readonly Repo[], f: Filters, now: number, favorites: ReadonlySet<string> = new Set()): Repo[] {
  return repos.filter((r) => {
    if (!inTab(r, f.tab, now, favorites)) return false;
    if (f.category !== 'all' && !r.categories.includes(f.category)) return false;
    if (f.language !== 'all' && (r.language ?? 'unknown') !== f.language) return false;
    if (r.stars < f.minStars) return false;
    if (f.dateRange > 0) {
      const iso = f.dateField === 'created' ? r.createdAt : r.pushedAt;
      if (ageMs(iso, now) > f.dateRange * DAY) return false;
    }
    return matchesQuery(r, f.query);
  });
}

const time = (iso: string) => new Date(iso).getTime();

export function sortRepos(repos: readonly Repo[], sort: SortId, tab: TabId): Repo[] {
  const key = sort === 'default' ? defaultSortForTab(tab) : sort;
  const byStars = (a: Repo, b: Repo) => b.stars - a.stars;
  const byNewest = (a: Repo, b: Repo) => time(b.createdAt) - time(a.createdAt);
  const byPushed = (a: Repo, b: Repo) => time(b.pushedAt) - time(a.pushedAt);
  const byName = (a: Repo, b: Repo) => a.fullName.localeCompare(b.fullName);
  const compare: Record<typeof key, (a: Repo, b: Repo) => number> = {
    stars: (a, b) => byStars(a, b) || byNewest(a, b) || byName(a, b),
    newest: (a, b) => byNewest(a, b) || byStars(a, b) || byName(a, b),
    pushed: (a, b) => byPushed(a, b) || byStars(a, b) || byName(a, b),
    forks: (a, b) => b.forks - a.forks || byStars(a, b) || byName(a, b),
    name: byName,
  };
  return [...repos].sort(compare[key]);
}

/** Languages present in the dataset, most common first. */
export function languageOptions(repos: readonly Repo[]): { language: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    const lang = r.language ?? 'unknown';
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
}

export function countByCategory(repos: readonly Repo[]): Map<CategoryId, number> {
  const counts = new Map<CategoryId, number>();
  for (const r of repos) for (const c of r.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return counts;
}
