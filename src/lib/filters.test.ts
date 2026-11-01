import { describe, expect, it } from 'vitest';
import { makeRepo } from '../test/factories';
import {
  applyFilters,
  countByCategory,
  DAY,
  DEFAULT_FILTERS,
  defaultSortForTab,
  inTab,
  languageOptions,
  matchesQuery,
  normalizeQuery,
  sortRepos,
  type Filters,
} from './filters';

const NOW = new Date('2026-11-01T12:00:00.000Z').getTime();
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();
const f = (o: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...o });

describe('inTab', () => {
  const fresh = makeRepo({ createdAt: ago(0.5), pushedAt: ago(0.1) });
  const week = makeRepo({ createdAt: ago(5), pushedAt: ago(5) });
  const month = makeRepo({ createdAt: ago(20), pushedAt: ago(20), stars: 3 });
  const oldActive = makeRepo({ createdAt: ago(800), pushedAt: ago(1), stars: 5000 });

  it('uses creation date for time windows', () => {
    expect(inTab(fresh, 'new24h', NOW)).toBe(true);
    expect(inTab(week, 'new24h', NOW)).toBe(false);
    expect(inTab(week, 'week', NOW)).toBe(true);
    expect(inTab(month, 'week', NOW)).toBe(false);
    expect(inTab(month, 'month', NOW)).toBe(true);
    expect(inTab(oldActive, 'month', NOW)).toBe(false);
  });
  it('uses last push for "updated"', () => {
    expect(inTab(oldActive, 'updated', NOW)).toBe(true);
    expect(inTab(month, 'updated', NOW)).toBe(false);
  });
  it('limits "popular" to recent repos with a minimum of stars', () => {
    expect(inTab(oldActive, 'popular', NOW)).toBe(false);
    expect(inTab(month, 'popular', NOW)).toBe(false);
    expect(inTab(makeRepo({ createdAt: ago(60), stars: 50 }), 'popular', NOW)).toBe(true);
  });
  it('uses the favorites set', () => {
    expect(inTab(week, 'favorites', NOW, new Set([week.fullName]))).toBe(true);
    expect(inTab(week, 'favorites', NOW, new Set())).toBe(false);
  });
});

describe('search', () => {
  it('normalizes accents and case', () => {
    expect(normalizeQuery('  Análisis   MALWARE ')).toBe('analisis malware');
  });
  it('requires every term to match name, owner, description or topics', () => {
    const r = makeRepo({ owner: 'acme', name: 'sub-finder', description: 'Fast subdomain enumeration', topics: ['recon'] });
    expect(matchesQuery(r, 'sub finder')).toBe(true);
    expect(matchesQuery(r, 'ACME subdomain')).toBe(true);
    expect(matchesQuery(r, 'recon')).toBe(true);
    expect(matchesQuery(r, 'subdomain kubernetes')).toBe(false);
    expect(matchesQuery(r, '')).toBe(true);
  });
});

describe('applyFilters', () => {
  const repos = [
    makeRepo({ id: 1, createdAt: ago(1), pushedAt: ago(1), categories: ['osint'], language: 'Go', stars: 100 }),
    makeRepo({ id: 2, createdAt: ago(2), pushedAt: ago(0.2), categories: ['red-team'], language: 'Python', stars: 5 }),
    makeRepo({ id: 3, createdAt: ago(6), pushedAt: ago(6), categories: ['osint', 'bug-bounty'], language: null, stars: 0 }),
  ];
  const ids = (list: { id: number }[]) => list.map((r) => r.id).sort();

  it('filters by category', () => {
    expect(ids(applyFilters(repos, f({ category: 'osint' }), NOW))).toEqual([1, 3]);
  });
  it('filters by language, including unknown', () => {
    expect(ids(applyFilters(repos, f({ language: 'Go' }), NOW))).toEqual([1]);
    expect(ids(applyFilters(repos, f({ language: 'unknown' }), NOW))).toEqual([3]);
  });
  it('filters by minimum stars', () => {
    expect(ids(applyFilters(repos, f({ minStars: 5 }), NOW))).toEqual([1, 2]);
  });
  it('filters by creation date or last activity', () => {
    expect(ids(applyFilters(repos, f({ dateField: 'created', dateRange: 1 }), NOW))).toEqual([1]);
    expect(ids(applyFilters(repos, f({ dateField: 'pushed', dateRange: 1 }), NOW))).toEqual([1, 2]);
  });
  it('combines tab, filters and search', () => {
    expect(ids(applyFilters(repos, f({ tab: 'new24h' }), NOW))).toEqual([1]);
    expect(ids(applyFilters(repos, f({ category: 'osint', minStars: 1 }), NOW))).toEqual([1]);
  });
});

describe('sortRepos', () => {
  const a = makeRepo({ id: 1, owner: 'a', name: 'a', stars: 10, forks: 9, createdAt: ago(3), pushedAt: ago(2) });
  const b = makeRepo({ id: 2, owner: 'b', name: 'b', stars: 50, forks: 1, createdAt: ago(1), pushedAt: ago(5) });
  const c = makeRepo({ id: 3, owner: 'c', name: 'c', stars: 50, forks: 3, createdAt: ago(2), pushedAt: ago(0.5) });
  const order = (list: { id: number }[]) => list.map((r) => r.id);

  it('sorts by stars with newest as tie-breaker', () => {
    expect(order(sortRepos([a, b, c], 'stars', 'week'))).toEqual([2, 3, 1]);
  });
  it('sorts by creation date, last push, forks and name', () => {
    expect(order(sortRepos([a, b, c], 'newest', 'week'))).toEqual([2, 3, 1]);
    expect(order(sortRepos([a, b, c], 'pushed', 'week'))).toEqual([3, 1, 2]);
    expect(order(sortRepos([a, b, c], 'forks', 'week'))).toEqual([1, 3, 2]);
    expect(order(sortRepos([c, b, a], 'name', 'week'))).toEqual([1, 2, 3]);
  });
  it('uses the tab default when sort is "default"', () => {
    expect(defaultSortForTab('popular')).toBe('stars');
    expect(defaultSortForTab('updated')).toBe('pushed');
    expect(defaultSortForTab('new24h')).toBe('newest');
    expect(order(sortRepos([a, b, c], 'default', 'updated'))).toEqual([3, 1, 2]);
  });
  it('does not mutate the input', () => {
    const input = [a, b, c];
    sortRepos(input, 'stars', 'week');
    expect(order(input)).toEqual([1, 2, 3]);
  });
});

describe('aggregations', () => {
  it('counts languages and categories', () => {
    const repos = [
      makeRepo({ language: 'Go', categories: ['osint'] }),
      makeRepo({ language: 'Go', categories: ['osint', 'red-team'] }),
      makeRepo({ language: null, categories: ['red-team'] }),
    ];
    expect(languageOptions(repos)).toEqual([
      { language: 'Go', count: 2 },
      { language: 'unknown', count: 1 },
    ]);
    const cats = countByCategory(repos);
    expect(cats.get('osint')).toBe(2);
    expect(cats.get('red-team')).toBe(2);
  });
});
