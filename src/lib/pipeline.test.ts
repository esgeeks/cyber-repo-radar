import { describe, expect, it } from 'vitest';
import { makeItem, makeRepo } from '../test/factories';
import { buildRepos, recentSubset, type QueryResult } from './pipeline';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const result = (items: QueryResult['items'], category: QueryResult['category'] = 'osint', trust = false): QueryResult => ({
  queryId: 'q',
  category,
  trust,
  items,
});

describe('buildRepos', () => {
  it('deduplicates by id across queries and merges query hints', () => {
    const item = makeItem({ id: 7, full_name: 'acme/recon', description: 'recon helper', topics: [] });
    const { repos, stats } = buildRepos([result([item], 'osint'), result([item], 'osint')], { now: NOW });
    expect(repos).toHaveLength(1);
    expect(stats.itemsFetched).toBe(2);
    expect(stats.unique).toBe(1);
    expect(repos[0]!.categories).toContain('osint');
  });

  it('keeps the freshest metadata when duplicates differ', () => {
    const older = makeItem({ id: 8, stargazers_count: 1, updated_at: '2026-10-31T00:00:00Z' });
    const newer = makeItem({ id: 8, stargazers_count: 9, updated_at: '2026-11-01T00:00:00Z' });
    const { repos } = buildRepos([result([older]), result([newer])], { now: NOW });
    expect(repos[0]!.stars).toBe(9);
  });

  it('discards irrelevant, spam and fork results', () => {
    const { repos, stats } = buildRepos(
      [
        result([
          makeItem({ id: 1, description: 'A todo app', topics: ['react'] }),
          makeItem({ id: 2, description: 'Free robux generator', topics: ['osint'] }),
          makeItem({ id: 3, fork: true }),
          makeItem({ id: 4 }),
        ]),
      ],
      { now: NOW },
    );
    expect(repos.map((r) => r.id)).toEqual([4]);
    expect(stats.rejected).toMatchObject({ irrelevant: 1, 'spam-pattern': 1, fork: 1 });
  });

  it('preserves firstSeen from the previous dataset and sets lastSeen to now', () => {
    const prev = makeRepo({ id: 5, firstSeen: '2026-10-20T00:00:00.000Z', lastSeen: '2026-11-01T09:00:00.000Z' });
    const { repos } = buildRepos([result([makeItem({ id: 5 })])], { now: NOW, previous: [prev] });
    expect(repos[0]!.firstSeen).toBe('2026-10-20T00:00:00.000Z');
    expect(repos[0]!.lastSeen).toBe(NOW.toISOString());
  });

  it('sets firstSeen to now for new repos', () => {
    const { repos } = buildRepos([result([makeItem({ id: 6 })])], { now: NOW });
    expect(repos[0]!.firstSeen).toBe(NOW.toISOString());
  });

  it('retains recently seen repos missing from this run, and drops old ones', () => {
    const recent = makeRepo({ id: 10, lastSeen: '2026-10-31T12:00:00.000Z' });
    const expired = makeRepo({ id: 11, lastSeen: '2026-10-20T12:00:00.000Z' });
    const { repos, stats } = buildRepos([], { now: NOW, previous: [recent, expired], retainHours: 72 });
    expect(repos.map((r) => r.id)).toEqual([10]);
    expect(repos[0]!.lastSeen).toBe('2026-10-31T12:00:00.000Z');
    expect(stats.retained).toBe(1);
  });

  it('attaches reviews by owner/name (case-insensitive)', () => {
    const { repos } = buildRepos([result([makeItem({ id: 12, full_name: 'Acme/Recon' })])], {
      now: NOW,
      reviews: { 'acme/recon': { url: 'https://www.esgeeks.com/recon/', title: 'Recon review' } },
    });
    expect(repos[0]!.review?.title).toBe('Recon review');
  });

  it('caps by priority: repos visible in a tab survive over older invisible ones', () => {
    const oldActive = makeItem({ id: 201, created_at: '2024-01-01T00:00:00Z', pushed_at: '2026-11-01T00:00:00Z' });
    const oldIdle = makeItem({ id: 202, created_at: '2026-08-01T00:00:00Z', pushed_at: '2026-08-02T00:00:00Z', stargazers_count: 0 });
    const fresh = makeItem({ id: 203, created_at: '2026-10-31T00:00:00Z' });
    const { repos } = buildRepos([result([oldActive, oldIdle, fresh])], { now: NOW, maxRepos: 2 });
    expect(repos.map((r) => r.id)).toEqual([203, 201]);
  });

  it('caps the number of repos, newest first', () => {
    const items = [1, 2, 3].map((i) => makeItem({ id: 100 + i, created_at: `2026-10-2${i}T00:00:00Z` }));
    const { repos } = buildRepos([result(items)], { now: NOW, maxRepos: 2 });
    expect(repos.map((r) => r.id)).toEqual([103, 102]);
  });

  it('flags PoC repositories', () => {
    const { repos } = buildRepos([result([makeItem({ id: 13, full_name: 'x/CVE-2026-1234', topics: ['exploit', 'pentesting'] })], 'pentesting')], {
      now: NOW,
    });
    expect(repos[0]!.flags).toEqual(['poc']);
  });
});

describe('recentSubset', () => {
  it('keeps only repos created in the window and marks the subset', () => {
    const meta = { schemaVersion: 1 as const, generatedAt: NOW.toISOString(), demo: false, queriesTotal: 1, queriesFailed: 0, itemsFetched: 2, repoCount: 2, partial: false, notes: [] };
    const fresh = makeRepo({ id: 1, createdAt: '2026-10-30T00:00:00.000Z' });
    const old = makeRepo({ id: 2, createdAt: '2026-10-01T00:00:00.000Z' });
    const sub = recentSubset({ meta, repos: [fresh, old] }, 7);
    expect(sub.repos.map((r) => r.id)).toEqual([1]);
    expect(sub.meta.subset).toEqual({ kind: 'recent', days: 7 });
    expect(sub.meta.repoCount).toBe(2);
  });
});
