import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AdSlot } from './components/AdSlot';
import { FilterPanel } from './components/FilterPanel';
import { CloseIcon, FilterIcon, SearchIcon, ShieldIcon } from './components/Icons';
import { AboutPage, Footer, Header, PrivacyPage } from './components/Layout';
import { RepoCard } from './components/RepoCard';
import { RepoDetail } from './components/RepoDetail';
import { SkeletonGrid, StateMessage } from './components/StateMessage';
import { SyncBadge, SyncWarnings } from './components/SyncStatus';
import { Tabs } from './components/Tabs';
import { useDataset } from './hooks/useDataset';
import { useDebounced } from './hooks/useDebounced';
import { useFavorites } from './hooks/useFavorites';
import { useHashState } from './hooks/useHashState';
import { interpolate, useI18n } from './i18n';
import {
  applyFilters,
  countByCategory,
  DEFAULT_FILTERS,
  inTab,
  languageOptions,
  sortRepos,
  TABS,
  type Filters,
  type TabId,
} from './lib/filters';
import { freshness } from './lib/format';
import type { DatasetMeta, Repo } from './lib/types';
import { buildHash, type HashState } from './lib/url-state';

const PAGE_SIZE = 24;
const SLOT_TOP = import.meta.env.VITE_ADSENSE_SLOT_TOP;
const SLOT_FEED = import.meta.env.VITE_ADSENSE_SLOT_FEED;

export default function App() {
  const { t } = useI18n();
  const { state, navigate } = useHashState();
  const { route, filters, demo } = state;
  const { state: data, retry } = useDataset(demo);
  const { favorites, toggle } = useFavorites();

  const hrefFor = useCallback((patch: Partial<HashState>) => buildHash({ ...state, ...patch }), [state]);
  const homeHref = hrefFor({ route: { name: 'home' } });
  const aboutHref = hrefFor({ route: { name: 'about' } });
  const privacyHref = hrefFor({ route: { name: 'privacy' } });

  const dataset = data.status === 'ready' ? data.data : null;
  const isDemo = dataset?.meta.demo ?? demo;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only z-50 rounded bg-accent px-3 py-2 font-mono text-sm text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      {isDemo && dataset && (
        <div className="border-b border-warn/40 bg-warn/10 px-4 py-2 text-center font-mono text-xs text-warn" role="note">
          {t.demo.banner}{' '}
          {demo && (
            <a href={buildHash({ ...state, demo: false })} className="underline underline-offset-2 hover:text-ink">
              {t.demo.exit}
            </a>
          )}
        </div>
      )}
      <Header
        route={route}
        homeHref={homeHref}
        aboutHref={aboutHref}
        privacyHref={privacyHref}
        right={dataset && !dataset.meta.demo ? <SyncBadge meta={dataset.meta} now={Date.now()} /> : null}
      />

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none">
        {route.name === 'about' ? (
          <AboutPage />
        ) : route.name === 'privacy' ? (
          <PrivacyPage />
        ) : data.status === 'loading' ? (
          <SkeletonGrid label={t.states.loading} />
        ) : data.status === 'error' ? (
          <StateMessage
            tone="error"
            code={`ERR: ${data.message}`}
            title={t.states.errorTitle}
            actions={
              <>
                <button type="button" className="btn-primary" onClick={retry}>
                  {t.states.retry}
                </button>
                {!demo && (
                  <a className="btn-ghost" href={buildHash({ ...state, demo: true })}>
                    {t.states.viewDemo}
                  </a>
                )}
              </>
            }
          >
            {t.states.errorBody}
          </StateMessage>
        ) : (
          <Radar
            repos={data.data.repos}
            generatedAt={data.data.meta.generatedAt}
            meta={data.data.meta}
            filters={filters}
            favorites={favorites}
            onToggleFavorite={toggle}
            onFilters={(next) => navigate({ ...state, filters: next, route: { name: 'home' } }, { replace: true })}
            detailHref={(fullName) => hrefFor({ route: { name: 'repo', fullName } })}
          />
        )}
      </main>

      {route.name === 'repo' && dataset && (
        <RepoDetail
          key={route.fullName}
          fullName={route.fullName}
          repo={dataset.repos.find((r) => r.fullName.toLowerCase() === route.fullName.toLowerCase()) ?? null}
          now={new Date(dataset.meta.generatedAt).getTime()}
          favorite={favorites.has(route.fullName)}
          demo={dataset.meta.demo}
          onToggleFavorite={toggle}
          onClose={() => navigate({ ...state, route: { name: 'home' } })}
        />
      )}

      <Footer aboutHref={aboutHref} privacyHref={privacyHref} />
    </div>
  );
}

interface RadarProps {
  repos: Repo[];
  generatedAt: string;
  meta: DatasetMeta;
  filters: Filters;
  favorites: Set<string>;
  onToggleFavorite: (fullName: string) => void;
  onFilters: (f: Filters) => void;
  detailHref: (fullName: string) => string;
}

function Radar({ repos, generatedAt, meta, filters, favorites, onToggleFavorite, onFilters, detailHref }: RadarProps) {
  const { t, locale } = useI18n();
  // Time windows are measured from the dataset generation time, so tabs stay consistent with the data.
  const now = useMemo(() => new Date(generatedAt).getTime(), [generatedAt]);
  const [query, setQuery] = useState(filters.query);
  const debouncedQuery = useDebounced(query, 200);
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const update = useCallback((patch: Partial<Filters>) => onFilters({ ...filters, ...patch }), [filters, onFilters]);

  // Sync the debounced search box into the URL.
  useEffect(() => {
    if (debouncedQuery !== filters.query) update({ query: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);
  // Reflect external URL changes (back button, shared links) in the search box.
  useEffect(() => {
    setQuery((q) => (q === filters.query ? q : filters.query));
  }, [filters.query]);

  // "/" focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const effective = useMemo(() => ({ ...filters, query: debouncedQuery }), [filters, debouncedQuery]);

  const results = useMemo(
    () => sortRepos(applyFilters(repos, effective, now, favorites), effective.sort, effective.tab),
    [repos, effective, now, favorites],
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<TabId, number>;
    for (const tab of TABS) counts[tab] = applyFilters(repos, { ...effective, tab }, now, favorites).length;
    return counts;
  }, [repos, effective, now, favorites]);

  const languages = useMemo(() => languageOptions(repos), [repos]);
  const categoryCounts = useMemo(
    () => countByCategory(repos.filter((r) => inTab(r, effective.tab, now, favorites))),
    [repos, effective.tab, now, favorites],
  );
  const new24h = useMemo(() => repos.filter((r) => inTab(r, 'new24h', now)).length, [repos, now]);

  useEffect(() => setVisible(PAGE_SIZE), [effective]);

  const canReset =
    JSON.stringify({ ...filters, tab: DEFAULT_FILTERS.tab }) !== JSON.stringify({ ...DEFAULT_FILTERS }) || query !== '';
  const reset = () => {
    setQuery('');
    onFilters({ ...DEFAULT_FILTERS, tab: filters.tab });
  };

  const activeFilterCount =
    Number(filters.category !== 'all') + Number(filters.language !== 'all') + Number(filters.minStars > 0) + Number(filters.dateRange > 0);
  const stale = !meta.demo && freshness(generatedAt) !== 'fresh';
  const shown = results.slice(0, visible);

  return (
    <div className="space-y-6">
      <section aria-labelledby="hero-title" className="space-y-4">
        <div>
          <p className="font-mono text-xs text-accent-dim" aria-hidden="true">
            $ radar --scan github --topics security --window {filters.tab}
          </p>
          <h1 id="hero-title" className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t.header.tagline}
          </h1>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:max-w-xl">
          {[
            { label: t.stats.new24h, value: new24h, accent: true },
            { label: t.stats.tracked, value: meta.repoCount },
            { label: t.stats.languages, value: languages.length },
          ].map((s) => (
            <div key={s.label} className="panel px-3 py-2.5">
              <dt className="truncate font-mono text-[10.5px] tracking-wider text-muted uppercase">{s.label}</dt>
              <dd className={`mt-0.5 font-mono text-xl font-semibold ${s.accent ? 'text-accent' : 'text-ink'}`}>
                {s.value.toLocaleString(locale)}
              </dd>
            </div>
          ))}
        </dl>
        <SyncWarnings meta={meta} now={Date.now()} />
      </section>

      <div className="relative">
        <label htmlFor="search" className="sr-only">
          {t.filters.search}
        </label>
        <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
        <input
          ref={searchRef}
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.filters.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          className="field py-3 pr-12 pl-11 font-mono text-[15px]"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-faint sm:block">
          /
        </kbd>
      </div>

      <Tabs active={filters.tab} counts={tabCounts} onSelect={(tab) => update({ tab })} />

      <AdSlot slot={SLOT_TOP} />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label={t.filters.title}>
          <button
            type="button"
            className="btn-ghost w-full lg:hidden"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? <CloseIcon size={14} /> : <FilterIcon size={14} />}
            {showFilters ? t.filters.hide : t.filters.show}
            {activeFilterCount > 0 && <span className="rounded bg-accent/15 px-1.5 text-accent">{activeFilterCount}</span>}
          </button>
          <div id="filter-panel" className={`panel mt-3 p-4 lg:mt-0 lg:block ${showFilters ? 'block' : 'hidden'}`}>
            <h2 className="mb-4 hidden font-mono text-xs tracking-wider text-muted uppercase lg:block">{t.filters.title}</h2>
            <FilterPanel
              filters={filters}
              languages={languages}
              categoryCounts={categoryCounts}
              onChange={update}
              onReset={reset}
              canReset={canReset}
            />
          </div>
          <div className="mt-4 hidden gap-3 rounded-lg border border-line bg-panel/60 p-3 text-xs leading-relaxed text-muted lg:flex">
            <ShieldIcon size={18} className="shrink-0 text-cyan" />
            <p>
              <strong className="text-ink">{t.security.title}.</strong> {t.security.body}
            </p>
          </div>
        </aside>

        <section id="results-panel" role="tabpanel" aria-labelledby={`tab-${filters.tab}`} aria-live="polite" aria-busy={query !== debouncedQuery}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted">{t.tabHints[filters.tab]}</p>
            <p className="font-mono text-xs text-faint">
              {results.length === 1 ? t.filters.oneResult : interpolate(t.filters.results, { count: results.length.toLocaleString(locale) })}
            </p>
          </div>

          {results.length === 0 ? (
            <StateMessage code="0 matches" title={t.states.emptyTitle}>
              <p>{filters.tab === 'favorites' && favorites.size === 0 ? t.states.emptyFavorites : t.states.emptyBody}</p>
              {stale && filters.tab !== 'favorites' && <p className="mt-2 text-warn">{t.states.emptyStale}</p>}
              {canReset && (
                <button type="button" onClick={reset} className="btn-ghost mt-4">
                  {t.filters.reset}
                </button>
              )}
            </StateMessage>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((repo, i) => (
                  <FeedItem key={repo.id} index={i}>
                    <RepoCard
                      repo={repo}
                      now={now}
                      favorite={favorites.has(repo.fullName)}
                      demo={meta.demo}
                      detailHref={detailHref(repo.fullName)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </FeedItem>
                ))}
              </div>
              {visible < results.length && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button type="button" className="btn-primary px-6" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    {t.states.loadMore}
                  </button>
                  <p className="font-mono text-[11px] text-faint">
                    {interpolate(t.states.showing, { shown: shown.length, total: results.length })}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Inserts an in-feed ad slot after every 12 cards when ads are configured. */
function FeedItem({ index, children }: { index: number; children: ReactNode }) {
  if (!SLOT_FEED || index === 0 || index % 12 !== 0) return <>{children}</>;
  return (
    <>
      <div className="sm:col-span-2 xl:col-span-3">
        <AdSlot slot={SLOT_FEED} />
      </div>
      {children}
    </>
  );
}
