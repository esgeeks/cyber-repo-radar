import { describe, expect, it } from 'vitest';
import { isSpanishPath, localeUrl } from './paths';

describe('paths', () => {
  it('detects the Spanish path at root and in sub-paths', () => {
    expect(isSpanishPath('/es/')).toBe(true);
    expect(isSpanishPath('/es/index.html')).toBe(true);
    expect(isSpanishPath('/cyber-repo-radar/es/')).toBe(true);
    expect(isSpanishPath('/')).toBe(false);
    expect(isSpanishPath('/estonia/')).toBe(false);
  });
  it('builds the URL of the other language keeping the hash', () => {
    expect(localeUrl('es', { pathname: '/', hash: '#/?tab=popular' })).toBe('/es/#/?tab=popular');
    expect(localeUrl('en', { pathname: '/es/', hash: '#/about' })).toBe('/#/about');
    expect(localeUrl('es', { pathname: '/cyber-repo-radar/', hash: '' })).toBe('/cyber-repo-radar/es/');
    expect(localeUrl('en', { pathname: '/cyber-repo-radar/es/index.html', hash: '' })).toBe('/cyber-repo-radar/');
    expect(localeUrl('en', { pathname: '/', hash: '#/' })).toBe('/#/');
  });
});
