import { interpolate, useI18n } from '../i18n';
import { formatDateTime, freshness, relativeTime } from '../lib/format';
import type { DatasetMeta } from '../lib/types';
import { AlertIcon } from './Icons';

/** Compact sync indicator for the header. */
export function SyncBadge({ meta, now }: { meta: DatasetMeta; now: number }) {
  const { t, locale } = useI18n();
  const state = freshness(meta.generatedAt, now);
  const color = state === 'fresh' ? 'bg-accent' : state === 'stale' ? 'bg-warn' : 'bg-danger';
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-muted"
      title={`${t.sync.label}: ${formatDateTime(meta.generatedAt, locale)} · ${t.sync.nextHint}`}
    >
      <span className="relative flex size-2">
        {state === 'fresh' && <span className={`absolute inline-flex size-full animate-ping rounded-full ${color} opacity-50`} />}
        <span className={`relative inline-flex size-2 rounded-full ${color}`} />
      </span>
      <span className="hidden sm:inline text-faint">{t.sync.label}:</span>
      <span className="sr-only sm:hidden">{t.sync.label}:</span>
      <time dateTime={meta.generatedAt} className="text-ink">
        <span className="sm:hidden">{relativeTime(meta.generatedAt, locale, now, 'narrow')}</span>
        <span className="hidden sm:inline">{relativeTime(meta.generatedAt, locale, now)}</span>
      </time>
    </div>
  );
}

/** Banner shown only when data is stale or the last sync was partial. */
export function SyncWarnings({ meta, now }: { meta: DatasetMeta; now: number }) {
  const { t, locale } = useI18n();
  if (meta.demo) return null;
  const state = freshness(meta.generatedAt, now);
  const messages: string[] = [];
  if (state !== 'fresh') {
    messages.push(interpolate(state === 'stale' ? t.sync.stale : t.sync.veryStale, { age: relativeTime(meta.generatedAt, locale, now) }));
  }
  if (meta.partial) messages.push(t.sync.partial);
  if (!messages.length) return null;
  const severe = state === 'very-stale';
  return (
    <div
      role="status"
      className={`flex gap-3 rounded-md border p-3 text-sm ${severe ? 'border-danger/40 bg-danger/5 text-danger' : 'border-warn/40 bg-warn/5 text-warn'}`}
    >
      <AlertIcon size={18} className="mt-px shrink-0" />
      <div className="space-y-1">
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
    </div>
  );
}
