import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { formatDateTime, relativeTime } from '../lib/format';
import { languageColor } from '../lib/languages';
import type { Repo } from '../lib/types';
import {
  AlertIcon,
  BirthIcon,
  BookIcon,
  CloseIcon,
  EyeIcon,
  ExternalIcon,
  ForkIcon,
  PulseIcon,
  RefreshIcon,
  ScaleIcon,
  ShieldIcon,
  StarIcon,
} from './Icons';

interface Props {
  repo: Repo | null;
  fullName: string;
  now: number;
  favorite: boolean;
  demo: boolean;
  onToggleFavorite: (fullName: string) => void;
  onClose: () => void;
}

function DateRow({ icon, label, iso, now, accent }: { icon: ReactNode; label: string; iso: string; now: number; accent?: boolean }) {
  const { locale } = useI18n();
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 ${accent ? 'text-accent' : 'text-cyan'}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[11px] tracking-wider text-muted uppercase">{label}</dt>
        <dd className="text-sm text-ink">
          <time dateTime={iso}>{formatDateTime(iso, locale)}</time>
          <span className="ml-2 font-mono text-xs text-faint">({relativeTime(iso, locale, now)})</span>
        </dd>
      </div>
    </div>
  );
}

/** Detail view rendered in a native modal <dialog> (focus trapping and Esc handled by the browser). */
export function RepoDetail({ repo, fullName, now, favorite, demo, onToggleFavorite, onClose }: Props) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  const licenseLabel = !repo?.license ? t.detail.noLicense : repo.license === 'Other' ? t.detail.otherLicense : repo.license;

  return (
    <dialog
      ref={ref}
      aria-labelledby="repo-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[92dvh] w-[min(760px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line-strong bg-panel p-0 text-ink shadow-2xl shadow-black/60"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-accent-dim">$ repo inspect</p>
            <h2 id="repo-detail-title" className="mt-1 font-mono text-lg font-semibold break-words">
              <span className="text-muted">{repo?.owner ?? fullName.split('/')[0]}/</span>
              {repo?.name ?? fullName.split('/')[1]}
            </h2>
          </div>
          {repo && (
            <button
              type="button"
              onClick={() => onToggleFavorite(repo.fullName)}
              aria-pressed={favorite}
              className={`btn-ghost ${favorite ? 'border-warn/50 text-warn' : ''}`}
            >
              <StarIcon filled={favorite} size={14} />
              <span className="hidden sm:inline">{t.tabs.favorites}</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label={t.detail.close} autoFocus>
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5">
          {!repo ? (
            <div className="py-6 text-center">
              <p className="text-muted">{t.detail.notFound}</p>
              <button type="button" onClick={onClose} className="btn-primary mt-4">
                {t.detail.back}
              </button>
            </div>
          ) : (
            <>
              <p className={`text-[15px] leading-relaxed ${repo.description ? 'text-ink/90' : 'text-faint italic'}`}>
                {repo.description ?? t.card.noDescription}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { icon: <StarIcon size={14} />, label: t.card.stars, value: repo.stars.toLocaleString(locale) },
                  { icon: <ForkIcon size={14} />, label: t.card.forks, value: repo.forks.toLocaleString(locale) },
                  { icon: <EyeIcon size={14} />, label: t.detail.openIssues, value: repo.openIssues.toLocaleString(locale) },
                  {
                    icon: <span className="size-2.5 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} />,
                    label: t.detail.language,
                    value: repo.language ?? '—',
                  },
                ].map((m) => (
                  <div key={m.label} className="rounded-md border border-line bg-bg/60 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted uppercase">
                      {m.icon}
                      {m.label}
                    </div>
                    <div className="mt-1 truncate font-mono text-base text-ink">{m.value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-[11px] text-faint">
                {t.detail.metricsAsOf} {formatDateTime(repo.lastSeen, locale)}
              </p>

              {repo.flags.includes('poc') && (
                <div className="mt-5 flex gap-3 rounded-md border border-warn/40 bg-warn/5 p-3 text-sm text-warn">
                  <AlertIcon size={18} className="shrink-0" />
                  <p>{t.card.pocTitle}</p>
                </div>
              )}

              <section className="mt-6" aria-labelledby="dates-h">
                <h3 id="dates-h" className="label">
                  {t.detail.dates}
                </h3>
                <dl className="divide-y divide-line rounded-md border border-line bg-bg/40 px-3">
                  <DateRow icon={<BirthIcon size={16} />} label={t.detail.createdAt} iso={repo.createdAt} now={now} />
                  <DateRow icon={<PulseIcon size={16} />} label={t.detail.pushedAt} iso={repo.pushedAt} now={now} accent />
                  <DateRow icon={<RefreshIcon size={16} />} label={t.detail.updatedAt} iso={repo.updatedAt} now={now} />
                  <DateRow icon={<EyeIcon size={16} />} label={t.detail.firstSeen} iso={repo.firstSeen} now={now} />
                </dl>
              </section>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <section aria-labelledby="cats-h">
                  <h3 id="cats-h" className="label">
                    {t.detail.categories}
                  </h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {repo.categories.map((c) => (
                      <li key={c} className="chip border-accent/30 text-accent">
                        #{t.categories[c]}
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="lic-h">
                  <h3 id="lic-h" className="label">
                    {t.detail.license}
                  </h3>
                  <p className="flex items-center gap-2 font-mono text-sm text-ink">
                    <ScaleIcon size={15} className="text-muted" /> {licenseLabel}
                  </p>
                </section>
              </div>

              <section className="mt-6" aria-labelledby="topics-h">
                <h3 id="topics-h" className="label">
                  {t.detail.topics}
                </h3>
                {repo.topics.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {repo.topics.map((topic) => (
                      <li key={topic} className="chip">
                        {topic}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-faint">{t.detail.noTopics}</p>
                )}
              </section>

              <div className="mt-6 flex gap-3 rounded-md border border-line bg-bg/40 p-3 text-xs leading-relaxed text-muted">
                <ShieldIcon size={18} className="shrink-0 text-cyan" />
                <p>
                  <strong className="text-ink">{t.security.title}.</strong> {t.security.body}
                </p>
              </div>
            </>
          )}
        </div>

        {repo && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-panel-2/50 px-5 py-3">
            {repo.review && !demo && (
              <a href={repo.review.url} target="_blank" rel="noopener" className="btn-ghost" title={repo.review.title}>
                <BookIcon size={14} /> {t.detail.readReview}
              </a>
            )}
            {demo ? (
              <span className="btn-primary cursor-not-allowed opacity-50" title={t.demo.linkDisabled} aria-disabled="true">
                {t.detail.open} <ExternalIcon size={14} />
              </span>
            ) : (
              <a href={repo.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="btn-primary">
                {t.detail.open} <ExternalIcon size={14} />
              </a>
            )}
          </footer>
        )}
      </div>
    </dialog>
  );
}
