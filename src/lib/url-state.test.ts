import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from './filters';
import { buildHash, parseHash } from './url-state';

describe('url state', () => {
  it('parses an empty hash to defaults', () => {
    expect(parseHash('')).toEqual({ route: { name: 'home' }, filters: DEFAULT_FILTERS, demo: false });
  });

  it('round-trips filters and routes', () => {
    const state = {
      route: { name: 'repo' as const, fullName: 'acme/recon.tool' },
      filters: { ...DEFAULT_FILTERS, tab: 'popular' as const, query: 'osint', category: 'osint' as const, minStars: 50, dateRange: 7, dateField: 'pushed' as const, sort: 'forks' as const, language: 'Go' },
      demo: true,
    };
    expect(parseHash(buildHash(state))).toEqual(state);
  });

  it('omits defaults to keep URLs short', () => {
    expect(buildHash({ route: { name: 'home' }, filters: DEFAULT_FILTERS, demo: false })).toBe('#/');
  });

  it('ignores invalid values', () => {
    const s = parseHash('#/?tab=hack&cat=nope&stars=-3&days=13&sort=x');
    expect(s.filters).toEqual(DEFAULT_FILTERS);
  });

  it('parses static pages and rejects malformed repo paths', () => {
    expect(parseHash('#/about').route).toEqual({ name: 'about' });
    expect(parseHash('#/privacy').route).toEqual({ name: 'privacy' });
    expect(parseHash('#/repo/<script>/x').route).toEqual({ name: 'home' });
  });
});
