import { describe, expect, it } from 'vitest';
import en from './en';
import es from './es';
import { detectLocale, interpolate } from './index';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('i18n', () => {
  it('detects Spanish from the browser and defaults to English', () => {
    expect(detectLocale(['es-MX', 'en'])).toBe('es');
    expect(detectLocale(['en-US', 'es'])).toBe('en');
    expect(detectLocale(['fr-FR', 'de'])).toBe('en');
    expect(detectLocale(['fr-FR', 'es-419'])).toBe('es');
    expect(detectLocale(undefined)).toBe('en');
  });
  it('interpolates placeholders', () => {
    expect(interpolate('{count} results', { count: 3 })).toBe('3 results');
    expect(interpolate('{missing}', {})).toBe('{missing}');
  });
  it('has the same keys in both languages', () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });
});
