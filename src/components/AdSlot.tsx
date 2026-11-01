import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptRequested = false;
function ensureScript(client: string) {
  if (scriptRequested) return;
  scriptRequested = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

/**
 * Advertising slot. Renders NOTHING unless VITE_ADSENSE_CLIENT and a slot id are configured at build time,
 * so no fake ads or empty boxes are shown. See README → "Publicidad (AdSense)".
 */
export function AdSlot({ slot, className = '' }: { slot: string | undefined; className?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!CLIENT || !slot || !ref.current) return;
    ensureScript(CLIENT);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad blocked or not ready */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;
  return (
    <aside className={`min-h-[100px] ${className}`} aria-label={t.ad.label}>
      <p className="mb-1 font-mono text-[10px] tracking-wider text-faint uppercase">{t.ad.label}</p>
      <ins
        ref={ref}
        className="adsbygoogle block"
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
