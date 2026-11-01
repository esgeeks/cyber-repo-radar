import { useCallback, useEffect, useState } from 'react';

const KEY = 'crr:favorites';

function read(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 1000) : []);
  } catch {
    return new Set();
  }
}

/** Favorites persisted in localStorage (keyed by owner/name) and synced across tabs. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setFavorites(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((fullName: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* storage full or unavailable: keep in memory */
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
