import { describe, expect, it } from 'vitest';
import config from '../../config/queries.json';
import { expandPlaceholders, resolveQueries, type QueriesConfig } from './queries';

const NOW = new Date('2026-11-01T12:00:00.000Z');

describe('expandPlaceholders', () => {
  it('turns relative windows into absolute dates', () => {
    expect(expandPlaceholders('topic:osint {{created:30}}', NOW)).toBe('topic:osint created:>=2026-10-02');
    expect(expandPlaceholders('{{pushed:3}} stars:>=50', NOW)).toBe('pushed:>=2026-10-29 stars:>=50');
  });
});

describe('resolveQueries', () => {
  it('resolves the shipped config without errors and appends base qualifiers', () => {
    const qs = resolveQueries(config as QueriesConfig, NOW);
    expect(qs.length).toBeGreaterThan(20);
    for (const q of qs) {
      expect(q.q).toContain('fork:false');
      expect(q.q).not.toContain('{{');
      expect(q.pages).toBeGreaterThanOrEqual(1);
      expect(q.pages).toBeLessThanOrEqual(10);
    }
  });

  it('keeps the request budget reasonable (< 80 requests per sync)', () => {
    const qs = resolveQueries(config as QueriesConfig, NOW);
    expect(qs.reduce((n, q) => n + q.pages, 0)).toBeLessThan(80);
  });

  it('rejects duplicate ids, unknown categories and placeholders', () => {
    const base: QueriesConfig = { baseQualifiers: '', defaults: { sort: 'updated', pages: 1 }, queries: [] };
    expect(() =>
      resolveQueries({ ...base, queries: [{ id: 'a', category: 'osint', q: 'x' }, { id: 'a', category: 'osint', q: 'y' }] }, NOW),
    ).toThrow(/Duplicate/);
    expect(() => resolveQueries({ ...base, queries: [{ id: 'a', category: 'nope' as never, q: 'x' }] }, NOW)).toThrow(/Unknown category/);
    expect(() => resolveQueries({ ...base, queries: [{ id: 'a', category: 'osint', q: '{{foo:1}}' }] }, NOW)).toThrow(/placeholder/);
  });

  it('clamps pages to 1..10', () => {
    const base: QueriesConfig = { baseQualifiers: '', defaults: { sort: 'updated', pages: 1 }, queries: [{ id: 'a', category: 'osint', q: 'x', pages: 50 }] };
    expect(resolveQueries(base, NOW)[0]!.pages).toBe(10);
  });
});
