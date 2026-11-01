import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { translationSupported, translations } from '../lib/translate';

const KEY = 'crr:translate';

type Status = 'off' | 'preparing' | 'on' | 'failed';

interface TranslateValue {
  /** True when the UI is Spanish and the browser has the built-in Translator API. */
  available: boolean;
  status: Status;
  progress: number;
  toggle: () => void;
}

const Ctx = createContext<TranslateValue>({ available: false, status: 'off', progress: 0, toggle: () => {} });

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const available = locale === 'es' && translationSupported();
  const [status, setStatus] = useState<Status>('off');
  const [progress, setProgress] = useState(0);

  const enable = useCallback(async () => {
    setStatus('preparing');
    const ok = await translations.prepare(setProgress);
    setStatus(ok ? 'on' : 'failed');
    try {
      localStorage.setItem(KEY, ok ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  // Restore the user's choice (the model is already downloaded, so no gesture is needed).
  useEffect(() => {
    if (!available) return;
    try {
      if (localStorage.getItem(KEY) === '1') void enable();
    } catch {
      /* ignore */
    }
  }, [available, enable]);

  const toggle = useCallback(() => {
    if (status === 'on') {
      setStatus('off');
      try {
        localStorage.setItem(KEY, '0');
      } catch {
        /* ignore */
      }
    } else if (status !== 'preparing') {
      void enable();
    }
  }, [status, enable]);

  const value = useMemo(() => ({ available, status, progress, toggle }), [available, status, progress, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTranslationControl() {
  return useContext(Ctx);
}

/** Returns the Spanish translation of `text` when translation is on, otherwise null. */
export function useTranslatedText(text: string | null): string | null {
  const { available, status } = useContext(Ctx);
  const active = available && status === 'on' && Boolean(text);
  useSyncExternalStore(translations.subscribe, translations.getVersion, translations.getVersion);
  useEffect(() => {
    if (active && text) translations.request(text);
  }, [active, text]);
  return active && text ? (translations.get(text) ?? null) : null;
}
