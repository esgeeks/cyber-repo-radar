import { memo } from 'react';
import { interpolate, useI18n } from '../i18n';
import { compactNumber, formatDate, relativeTime } from '../lib/format';
import { languageColor } from '../lib/languages';
import { useTranslatedText } from '../hooks/useTranslation';
import { scrollToResults } from '../lib/scroll';
import type { CategoryId, Repo } from '../lib/types';
import { AlertIcon, BirthIcon, BookIcon, ExternalIcon, ForkIcon, PulseIcon, StarIcon } from './Icons';

interface Props {
  repo: Repo;
  now: number;
  favorite: boolean;
  demo: boolean;
  detailHref: string;
  filterHref: (patch: { category?: CategoryId; query?: string }) => string;
  onToggleFavorite: (fullName: string) => void;
}

const MAX_TOPICS = 5;

function RepoCardImpl({ repo, now, favorite, demo, detailHref, filterHref, onToggleFavorite }: Props) {
  const { t, locale } = useI18n();
  const favLabel = interpolate(favorite ? t.card.removeFavorite : t.card.addFavorite, { name: repo.fullName });
  const extraTopics = repo.topics.length - MAX_TOPICS;
  const translated = useTranslatedText(repo.description);

  return (
    <article className="group panel relative flex flex-col p-4 transition-colors hover:border-line-strong animate-fade-in">
      <header className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-panel-2 font-mono text-sm font-semibold text-cyan uppercase"
        >
          {repo.owner.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-[15px] leading-snug font-semibold">
            <a
              href={detailHref}
              className="wrap-anywhere text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent focus-visible:outline-none"
            >
              {repo.name}
            </a>
          </h3>
          <p className="truncate font-mono text-xs text-muted">
            <span className="text-faint">@</span>
            {repo.owner}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {repo.categories.slice(0, 2).map((c) => (
              <a
                key={c}
                href={filterHref({ category: c })}
                onClick={scrollToResults}
                title={interpolate(t.card.filterCategory, { name: t.categories[c] })}
                className="relative z-10 rounded font-mono text-[11px] text-accent-dim hover:text-accent hover:underline"
              >
                #{t.categories[c]}
              </a>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(repo.fullName)}
          aria-pressed={favorite}
          aria-label={favLabel}
          title={favLabel}
          className={`relative z-10 -m-1 rounded-md p-1.5 transition-colors ${
            favorite ? 'text-warn' : 'text-faint hover:text-ink'
          }`}
        >
          <StarIcon filled={favorite} size={18} />
        </button>
      </header>

      <p
        className={`mt-3 line-clamp-3 text-sm leading-relaxed ${repo.description ? 'text-ink/85' : 'text-faint italic'}`}
        title={translated ? `${t.translate.original}: ${repo.description}` : undefined}
        lang={translated ? 'es' : undefined}
      >
        {translated ?? repo.description ?? t.card.noDescription}
      </p>
      {translated && <p className="mt-1 font-mono text-[10.5px] text-faint">↻ {t.translate.badge}</p>}

      {(repo.flags.includes('poc') || repo.review) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.flags.includes('poc') && (
            <span className="chip border-warn/40 text-warn" title={t.card.pocTitle}>
              <AlertIcon size={12} /> {t.card.poc}
            </span>
          )}
          {repo.review && (
            <span className="chip border-cyan/40 text-cyan">
              <BookIcon size={12} /> {t.card.reviewed}
            </span>
          )}
        </div>
      )}

      {repo.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.detail.topics}>
          {repo.topics.slice(0, MAX_TOPICS).map((topic) => (
            <li key={topic}>
              <a
                href={filterHref({ query: topic })}
                onClick={scrollToResults}
                title={interpolate(t.card.filterTopic, { name: topic })}
                className="chip relative z-10 hover:border-line-strong hover:text-ink"
              >
                {topic}
              </a>
            </li>
          ))}
          {extraTopics > 0 && <li className="chip text-faint">+{extraTopics}</li>}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-3 font-mono text-[11.5px]">
          <div className="col-span-2 flex items-center gap-1.5 text-muted" title={`${t.card.created}: ${formatDate(repo.createdAt, locale)}`}>
            <BirthIcon size={13} className="text-cyan" />
            <span className="sr-only">{t.card.created}: </span>
            <span>
              <span className="text-faint">{t.card.created} </span>
              <time dateTime={repo.createdAt}>{relativeTime(repo.createdAt, locale, now)}</time>
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-muted" title={`${t.card.activity}: ${formatDate(repo.pushedAt, locale)}`}>
            <PulseIcon size={13} className="text-accent" />
            <span className="sr-only">{t.card.activity}: </span>
            <span>
              <span className="text-faint">{t.card.activity} </span>
              <time dateTime={repo.pushedAt}>{relativeTime(repo.pushedAt, locale, now)}</time>
            </span>
          </div>
          <div className="flex items-center gap-3 text-muted">
            <span className="flex items-center gap-1" title={`${repo.stars} ${t.card.stars}`}>
              <StarIcon size={13} />
              <span className="sr-only">{t.card.stars}: </span>
              <span>{compactNumber(repo.stars, locale)}</span>
            </span>
            <span className="flex items-center gap-1" title={`${repo.forks} ${t.card.forks}`}>
              <ForkIcon size={13} />
              <span className="sr-only">{t.card.forks}: </span>
              <span>{compactNumber(repo.forks, locale)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: languageColor(repo.language) }} aria-hidden="true" />
              <span className="sr-only">{t.detail.language}: </span>
              <span className="truncate">{repo.language ?? '—'}</span>
            </span>
            {demo ? (
              <span className="relative z-10 text-faint" title={t.demo.linkDisabled}>
                <ExternalIcon size={14} />
              </span>
            ) : (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="relative z-10 flex items-center gap-1 text-muted hover:text-accent"
                aria-label={`${t.detail.open}: ${repo.fullName}`}
              >
                {t.card.openGithub} <ExternalIcon size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export const RepoCard = memo(RepoCardImpl);
