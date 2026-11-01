import { interpolate, useI18n } from '../i18n';
import { DATE_RANGES, STAR_STEPS, SORTS, type DateField, type Filters, type SortId } from '../lib/filters';
import { CATEGORY_IDS, type CategoryId } from '../lib/types';

interface Props {
  filters: Filters;
  languages: { language: string; count: number }[];
  categoryCounts: Map<CategoryId, number>;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  canReset: boolean;
}

export function FilterPanel({ filters, languages, categoryCounts, onChange, onReset, canReset }: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="f-category" className="label">
          {t.filters.category}
        </label>
        <select
          id="f-category"
          className="field"
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value as CategoryId | 'all' })}
        >
          <option value="all">{t.filters.allCategories}</option>
          {CATEGORY_IDS.map((c) => (
            <option key={c} value={c}>
              {t.categories[c]} ({categoryCounts.get(c) ?? 0})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="f-language" className="label">
          {t.filters.language}
        </label>
        <select id="f-language" className="field" value={filters.language} onChange={(e) => onChange({ language: e.target.value })}>
          <option value="all">{t.filters.allLanguages}</option>
          {filters.language !== 'all' && !languages.some((l) => l.language === filters.language) && (
            <option value={filters.language}>{filters.language} (0)</option>
          )}
          {languages.map(({ language, count }) => (
            <option key={language} value={language}>
              {language === 'unknown' ? t.filters.unknownLanguage : language} ({count})
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">{t.filters.minStars}</legend>
        <div className="flex flex-wrap gap-1.5">
          {STAR_STEPS.map((n) => {
            const active = filters.minStars === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ minStars: n })}
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                  active ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                {n === 0 ? t.filters.anyStars : `≥${n >= 1000 ? `${n / 1000}k` : n}`}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">{t.filters.date}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-bg p-1" role="radiogroup" aria-label={t.filters.dateField}>
          {(['created', 'pushed'] as DateField[]).map((field) => {
            const active = filters.dateField === field;
            return (
              <button
                key={field}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ dateField: field })}
                className={`rounded px-2 py-1.5 font-mono text-xs transition-colors ${
                  active ? (field === 'created' ? 'bg-cyan/15 text-cyan' : 'bg-accent/15 text-accent') : 'text-muted hover:text-ink'
                }`}
              >
                {field === 'created' ? t.filters.created : t.filters.pushed}
              </button>
            );
          })}
        </div>
        <select
          aria-label={t.filters.date}
          className="field mt-2"
          value={filters.dateRange}
          onChange={(e) => onChange({ dateRange: Number(e.target.value) })}
        >
          {DATE_RANGES.map((d) => (
            <option key={d} value={d}>
              {d === 0 ? t.filters.anyDate : d === 1 ? t.filters.lastDay : interpolate(t.filters.lastDays, { n: d })}
            </option>
          ))}
        </select>
      </fieldset>

      <div>
        <label htmlFor="f-sort" className="label">
          {t.filters.sort}
        </label>
        <select id="f-sort" className="field" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortId })}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t.filters.sorts[s]}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={onReset} disabled={!canReset} className="btn-ghost w-full">
        {t.filters.reset}
      </button>
    </div>
  );
}
