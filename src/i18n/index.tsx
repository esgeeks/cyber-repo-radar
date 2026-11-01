import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en, { type Messages } from './en';
import es from './es';
import { localeUrl, ON_ES_PATH } from '../lib/paths';

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
const MESSAGES: Record<Locale, Messages> = { en, es };
const STORAGE_KEY = 'crr:lang';

/** English is the original language; Spanish is used when the browser prefers it. */
export function detectLocale(languages: readonly string[] | undefined): Locale {
  for (const lang of languages ?? []) {
    const base = lang.toLowerCase().split('-')[0];
    if (base === 'es') return 'es';
    if (base === 'en') return 'en';
  }
  return 'en';
}

/** Locale saved by the user, or detected from the browser (ignores the URL). */
export function preferredLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    /* storage unavailable */
  }
  return detectLocale(typeof navigator !== 'undefined' ? navigator.languages : undefined);
}

/**
 * In production each language has its own URL ("/" and "/es/"). Visitors on "/" whose saved or
 * browser language is Spanish are sent to "/es/" (search engine bots browse in English, so they
 * are not redirected). Returns true when a redirect was started.
 */
export function redirectToPreferredLocale(): boolean {
  if (!import.meta.env.PROD || ON_ES_PATH) return false;
  if (preferredLocale() !== 'es') return false;
  location.replace(localeUrl('es', location));
  return true;
}

function initialLocale(): Locale {
  if (ON_ES_PATH) return 'es';
  return import.meta.env.PROD ? 'en' : preferredLocale();
}

/** Replaces {placeholders} in a message. */
export function interpolate(message: string, vars: Record<string, string | number> = {}): string {
  return message.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // In production, switching language means going to the other URL (keeps filters in the hash).
    if (import.meta.env.PROD && (l === 'es') !== ON_ES_PATH) {
      location.assign(localeUrl(l, location));
      return;
    }
    setLocaleState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = MESSAGES[locale].meta.title;
  }, [locale]);

  const value = useMemo(() => ({ locale, t: MESSAGES[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
