import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { Route } from '../lib/url-state';
import { RadarLogo } from './Icons';

interface HeaderProps {
  route: Route;
  homeHref: string;
  aboutHref: string;
  privacyHref: string;
  right?: ReactNode;
}

export function Header({ route, homeHref, aboutHref, privacyHref, right }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const navItem = (href: string, label: string, active: boolean) => (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded px-2 py-1 font-mono text-xs transition-colors ${active ? 'text-accent' : 'text-muted hover:text-ink'}`}
    >
      {label}
    </a>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <a href={homeHref} className="flex min-w-0 items-center gap-2.5" aria-label="Cyber Repo Radar — home">
          <RadarLogo size={30} />
          <span className="min-w-0">
            <span className="block truncate font-mono text-xs font-bold tracking-[0.08em] text-ink sm:text-sm sm:tracking-[0.18em]">
              CYBER<span className="text-accent">_</span>REPO<span className="text-accent">_</span>RADAR
            </span>
            <span className="hidden truncate text-[11px] text-faint md:block">{t.header.tagline}</span>
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Main">
          {navItem(homeHref, t.header.nav.radar, route.name === 'home' || route.name === 'repo')}
          {navItem(aboutHref, t.header.nav.about, route.name === 'about')}
          {navItem(privacyHref, t.header.nav.privacy, route.name === 'privacy')}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:ml-2">
          {right}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            className="rounded-md border border-line px-2 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-line-strong hover:text-ink"
            aria-label={t.header.switchLang}
            title={t.header.switchLang}
          >
            <span className={locale === 'en' ? 'text-accent' : ''}>EN</span>
            <span className="px-1 text-faint">/</span>
            <span className={locale === 'es' ? 'text-accent' : ''}>ES</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer({ aboutHref, privacyHref }: { aboutHref: string; privacyHref: string }) {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 text-xs leading-relaxed text-faint">
        <p>{t.footer.disclaimer}</p>
        <p>{t.security.body}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono">
          <span>
            {t.footer.by}{' '}
            <a href="https://www.esgeeks.com/" className="text-muted hover:text-accent" rel="noopener">
              EsGeeks
            </a>
          </span>
          <span>{t.footer.notAffiliated}</span>
          <a href={aboutHref} className="text-muted hover:text-accent">
            {t.header.nav.about}
          </a>
          <a href={privacyHref} className="text-muted hover:text-accent">
            {t.header.nav.privacy}
          </a>
          <span>© {new Date().getFullYear()} EsGeeks</span>
        </div>
      </div>
    </footer>
  );
}

export function AboutPage() {
  const { t } = useI18n();
  return (
    <article className="panel mx-auto max-w-3xl p-6 sm:p-8">
      <p className="font-mono text-xs text-accent-dim">$ cat ABOUT.md</p>
      <h1 className="mt-2 font-mono text-2xl font-semibold text-ink">{t.about.title}</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-ink/85">
        {t.about.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <h2 className="mt-8 font-mono text-lg font-semibold text-ink">{t.about.datesTitle}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink/85 marker:text-accent">
        {t.about.dates.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <div className="mt-8 rounded-md border border-line bg-bg/40 p-4 text-sm text-muted">
        <strong className="text-ink">{t.security.title}.</strong> {t.security.body}
      </div>
    </article>
  );
}

export function PrivacyPage() {
  const { t } = useI18n();
  return (
    <article className="panel mx-auto max-w-3xl p-6 sm:p-8">
      <p className="font-mono text-xs text-accent-dim">$ cat PRIVACY.md</p>
      <h1 className="mt-2 font-mono text-2xl font-semibold text-ink">{t.privacy.title}</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-ink/85">
        {t.privacy.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="mt-6 font-mono text-xs text-faint">{t.privacy.updated}</p>
    </article>
  );
}
