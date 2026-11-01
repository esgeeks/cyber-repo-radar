import { useCallback, useSyncExternalStore } from 'react';
import { buildHash, parseHash, type HashState } from '../lib/url-state';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
const getHash = () => window.location.hash;

/** Router + filter state stored in the URL hash, so every view is shareable and works on static hosting. */
export function useHashState() {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const state = parseHash(hash);

  const navigate = useCallback((next: HashState, { replace = false } = {}) => {
    const target = buildHash(next);
    if (target === window.location.hash || (target === '#/' && !window.location.hash)) return;
    if (replace) {
      history.replaceState(null, '', target);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = target;
    }
  }, []);

  return { state, navigate };
}
