import categoriesConfig from '../../config/categories.json';
import { CATEGORY_IDS, type CategoryId, type RepoFlag } from './types';

export interface CategoryRule {
  topics: string[];
  keywords: string[];
}

export type CategoryRules = Record<CategoryId, CategoryRule>;

export const DEFAULT_RULES = categoriesConfig.categories as CategoryRules;

export const WEIGHTS = { topic: 3, name: 2, description: 1, queryHint: 1, trustedQueryHint: 2 } as const;
export const MIN_CATEGORY_SCORE = 2;

export interface ClassifyInput {
  name: string;
  description: string | null;
  topics: string[];
}

export interface ClassifyHints {
  /** Categories of the search queries that returned this repo. */
  hinted?: Iterable<CategoryId>;
  /** Categories of trusted queries (e.g. curated README searches) that returned this repo. */
  trusted?: Iterable<CategoryId>;
}

/** "AI-PentestAgent_v2" -> "ai pentest agent v2" */
export function normalizeName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .toLowerCase()
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const keywordCache = new Map<string, RegExp>();
function keywordRegExp(keyword: string): RegExp {
  let re = keywordCache.get(keyword);
  if (!re) {
    // Treat hyphens/spaces as interchangeable and require word boundaries.
    const body = keyword
      .toLowerCase()
      .split(/[\s-]+/)
      .map(escapeRegExp)
      .join('[\\s-]+');
    re = new RegExp(`(^|[^a-z0-9])${body}($|[^a-z0-9])`);
    keywordCache.set(keyword, re);
  }
  return re;
}

export function matchesKeyword(text: string, keyword: string): boolean {
  return keywordRegExp(keyword).test(text);
}

export function scoreCategories(
  repo: ClassifyInput,
  rules: CategoryRules = DEFAULT_RULES,
  hints: ClassifyHints = {},
): Map<CategoryId, number> {
  const name = normalizeName(repo.name);
  const description = (repo.description ?? '').toLowerCase();
  const topics = new Set(repo.topics);
  const hinted = new Set(hints.hinted ?? []);
  const trusted = new Set(hints.trusted ?? []);
  const scores = new Map<CategoryId, number>();

  for (const id of CATEGORY_IDS) {
    const rule = rules[id];
    if (!rule) continue;
    let score = 0;
    if (rule.topics.some((t) => topics.has(t))) score += WEIGHTS.topic;
    if (rule.keywords.some((k) => matchesKeyword(name, k))) score += WEIGHTS.name;
    if (description && rule.keywords.some((k) => matchesKeyword(description, k))) score += WEIGHTS.description;
    if (trusted.has(id)) score += WEIGHTS.trustedQueryHint;
    else if (hinted.has(id)) score += WEIGHTS.queryHint;
    if (score > 0) scores.set(id, score);
  }
  return scores;
}

/**
 * Returns the categories a repo belongs to, best match first.
 * The generic "cybersecurity" bucket goes last when a more specific category exists.
 * An empty array means the repo is not relevant enough and should be discarded.
 */
export function classify(repo: ClassifyInput, rules: CategoryRules = DEFAULT_RULES, hints: ClassifyHints = {}): CategoryId[] {
  const scores = scoreCategories(repo, rules, hints);
  const order = (id: CategoryId) => CATEGORY_IDS.indexOf(id);
  const kept = [...scores.entries()]
    .filter(([, s]) => s >= MIN_CATEGORY_SCORE)
    .sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]))
    .map(([id]) => id);
  if (kept.length > 1 && kept.includes('cybersecurity')) {
    return [...kept.filter((c) => c !== 'cybersecurity'), 'cybersecurity'];
  }
  return kept;
}

const POC_RE = /(^|[^a-z0-9])(cve[\s_-]?\d{4}[\s_-]?\d{3,}|poc|proof[\s-]of[\s-]concept|exploit|exploits|0day|zero[\s-]?day|rce)($|[^a-z0-9])/;

/** Flags repos that claim to contain exploits / proofs of concept, so the UI can warn users. */
export function detectFlags(repo: ClassifyInput): RepoFlag[] {
  const haystack = [normalizeName(repo.name), (repo.description ?? '').toLowerCase(), repo.topics.join(' ')].join(' ');
  return POC_RE.test(haystack) ? ['poc'] : [];
}
