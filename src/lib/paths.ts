/**
 * The same build is served at "/" (English) and "/es/" (Spanish, indexable with hreflang).
 * Paths to shared files (data, favicon) are resolved relative to the app root.
 */
export function isSpanishPath(pathname: string): boolean {
  return /\/es\/(index\.html)?$/.test(pathname);
}

export const ON_ES_PATH = typeof location !== 'undefined' && isSpanishPath(location.pathname);
export const ROOT = ON_ES_PATH ? '../' : './';

/** URL of the same view in the other language version (keeps the hash, i.e. filters and route). */
export function localeUrl(target: 'en' | 'es', loc: Pick<Location, 'pathname' | 'hash'>): string {
  const onEs = isSpanishPath(loc.pathname);
  const base = loc.pathname.replace(/(es\/)?(index\.html)?$/, '');
  const path = target === 'es' ? `${base}es/` : base;
  return onEs === (target === 'es') ? `${loc.pathname}${loc.hash}` : `${path}${loc.hash}`;
}
