import { useRef, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n';
import { TABS, type TabId } from '../lib/filters';

interface Props {
  active: TabId;
  counts: Record<TabId, number>;
  onSelect: (tab: TabId) => void;
}

/** Accessible tablist: arrow keys / Home / End move between tabs. */
export function Tabs({ active, counts, onSelect }: Props) {
  const { t } = useI18n();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onSelect(TABS[next]!);
    }
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      <div role="tablist" aria-label={t.tabs.label} className="flex min-w-max gap-1 border-b border-line">
        {TABS.map((tab, i) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`tab-${tab}`}
              aria-selected={selected}
              aria-controls="results-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative flex items-center gap-2 px-3 py-2.5 font-mono text-[13px] whitespace-nowrap transition-colors ${
                selected ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {tab === 'favorites' && <span aria-hidden="true">★</span>}
              {t.tabs[tab]}
              <span
                className={`rounded px-1.5 py-px text-[10.5px] ${selected ? 'bg-accent/15 text-accent' : 'bg-panel-2 text-faint'}`}
              >
                {counts[tab]}
              </span>
              {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
