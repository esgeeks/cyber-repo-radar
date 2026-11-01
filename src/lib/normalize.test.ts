import { describe, expect, it } from 'vitest';
import { makeItem } from '../test/factories';
import { cleanText, MAX_DESCRIPTION_LENGTH, normalizeLicense, normalizeRepo, normalizeTopics } from './normalize';

describe('cleanText', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanText('  hello \n\t world  ')).toBe('hello world');
  });
  it('removes control and bidi override characters', () => {
    expect(cleanText('evil‮txt.exe\u0000 tool')).toBe('evil txt.exe tool');
  });
  it('returns null for empty or missing values', () => {
    expect(cleanText('   ')).toBeNull();
    expect(cleanText(null)).toBeNull();
    expect(cleanText(undefined)).toBeNull();
  });
  it('truncates long text with an ellipsis', () => {
    const out = cleanText('a'.repeat(1000))!;
    expect(out.length).toBe(MAX_DESCRIPTION_LENGTH);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('normalizeTopics', () => {
  it('lowercases, deduplicates, sorts and drops invalid topics', () => {
    expect(normalizeTopics(['OSINT', 'osint', 'red-team', ' recon ', 'bad topic', ''])).toEqual(['osint', 'recon', 'red-team']);
  });
  it('handles undefined', () => {
    expect(normalizeTopics(undefined)).toEqual([]);
  });
});

describe('normalizeLicense', () => {
  it('maps SPDX ids, NOASSERTION and missing licenses', () => {
    expect(normalizeLicense({ spdx_id: 'Apache-2.0' })).toBe('Apache-2.0');
    expect(normalizeLicense({ spdx_id: 'NOASSERTION' })).toBe('Other');
    expect(normalizeLicense({ spdx_id: null })).toBe('Other');
    expect(normalizeLicense(null)).toBeNull();
  });
});

describe('normalizeRepo', () => {
  it('maps API fields to the internal shape', () => {
    const r = normalizeRepo(makeItem({ id: 1, full_name: 'acme/scanner', stargazers_count: 42, topics: ['Security'] }))!;
    expect(r).toMatchObject({
      id: 1,
      fullName: 'acme/scanner',
      owner: 'acme',
      name: 'scanner',
      url: 'https://github.com/acme/scanner',
      stars: 42,
      topics: ['security'],
      license: 'MIT',
      createdAt: '2026-10-30T10:00:00.000Z',
      isPublic: true,
    });
  });

  it('builds the URL itself and rejects items whose html_url points elsewhere', () => {
    expect(normalizeRepo(makeItem({ full_name: 'acme/x', html_url: 'https://evil.example/acme/x' }))).toBeNull();
  });

  it('rejects malformed names', () => {
    expect(normalizeRepo(makeItem({ full_name: 'acme', html_url: '' }))).toBeNull();
    expect(normalizeRepo(makeItem({ full_name: 'a/b/c', html_url: '' }))).toBeNull();
    expect(normalizeRepo(makeItem({ full_name: 'ac me/x', html_url: '' }))).toBeNull();
  });

  it('falls back to createdAt when pushed_at is missing and rejects invalid created dates', () => {
    expect(normalizeRepo(makeItem({ pushed_at: null }))!.pushedAt).toBe('2026-10-30T10:00:00.000Z');
    expect(normalizeRepo(makeItem({ created_at: 'nope' }))).toBeNull();
  });

  it('never produces negative metrics', () => {
    const r = normalizeRepo(makeItem({ stargazers_count: -5, forks_count: Number.NaN }))!;
    expect(r.stars).toBe(0);
    expect(r.forks).toBe(0);
  });

  it('marks private repos as not public', () => {
    expect(normalizeRepo(makeItem({ private: true }))!.isPublic).toBe(false);
  });
});
