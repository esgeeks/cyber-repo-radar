const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "3 hours ago" / "hace 3 horas". */
export function relativeTime(iso: string, locale: string, now: number = Date.now(), style: 'long' | 'narrow' = 'long'): string {
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, 'minute');
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

/** 1234 -> "1.2k" */
export function compactNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export const STALE_AFTER_MS = 6 * 3_600_000;
export const VERY_STALE_AFTER_MS = 24 * 3_600_000;

export type Freshness = 'fresh' | 'stale' | 'very-stale';

export function freshness(generatedAt: string, now: number = Date.now()): Freshness {
  const age = now - new Date(generatedAt).getTime();
  if (age > VERY_STALE_AFTER_MS) return 'very-stale';
  if (age > STALE_AFTER_MS) return 'stale';
  return 'fresh';
}
