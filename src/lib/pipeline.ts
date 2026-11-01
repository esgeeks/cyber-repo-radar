import { classify, detectFlags, type CategoryRules, DEFAULT_RULES } from './classify';
import { normalizeRepo, type NormalizedRepo } from './normalize';
import { DEFAULT_BLOCKLIST, rejectReason, type CompiledBlocklist, type RejectReason } from './quality';
import type { CategoryId, Dataset, GitHubRepoItem, Repo, Review } from './types';

export interface QueryResult {
  queryId: string;
  category: CategoryId;
  trust: boolean;
  items: GitHubRepoItem[];
}

export interface BuildOptions {
  now: Date;
  previous?: Repo[];
  reviews?: Record<string, Review>;
  rules?: CategoryRules;
  blocklist?: CompiledBlocklist;
  /** Keep repos from the previous dataset that were not returned this time, for up to this many hours. */
  retainHours?: number;
  /** Hard cap on the number of repos written (keeps the JSON small). */
  maxRepos?: number;
}

export interface BuildStats {
  itemsFetched: number;
  unique: number;
  rejected: Partial<Record<RejectReason | 'irrelevant' | 'invalid', number>>;
  retained: number;
  kept: number;
}

interface Candidate {
  repo: NormalizedRepo;
  hinted: Set<CategoryId>;
  trusted: Set<CategoryId>;
}

/**
 * Deduplicates raw API results, applies quality filters, classifies, merges history
 * (firstSeen) from the previous dataset and returns the final list of repos.
 * Pure function: no network or file access, so it is fully unit-testable.
 */
export function buildRepos(results: QueryResult[], opts: BuildOptions): { repos: Repo[]; stats: BuildStats } {
  const nowIso = opts.now.toISOString();
  const rules = opts.rules ?? DEFAULT_RULES;
  const blocklist = opts.blocklist ?? DEFAULT_BLOCKLIST;
  const retainMs = (opts.retainHours ?? 72) * 3_600_000;
  const maxRepos = opts.maxRepos ?? 3500;
  const stats: BuildStats = { itemsFetched: 0, unique: 0, rejected: {}, retained: 0, kept: 0 };
  const reject = (reason: keyof BuildStats['rejected']) => {
    stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
  };

  // 1. Normalize + deduplicate by GitHub id (stable across renames).
  const candidates = new Map<number, Candidate>();
  for (const result of results) {
    for (const item of result.items) {
      stats.itemsFetched++;
      const repo = normalizeRepo(item);
      if (!repo) {
        reject('invalid');
        continue;
      }
      let c = candidates.get(repo.id);
      if (!c) {
        c = { repo, hinted: new Set(), trusted: new Set() };
        candidates.set(repo.id, c);
      } else if (repo.updatedAt > c.repo.updatedAt) {
        c.repo = repo; // keep the freshest copy of the metadata
      }
      (result.trust ? c.trusted : c.hinted).add(result.category);
    }
  }
  stats.unique = candidates.size;

  const previousById = new Map((opts.previous ?? []).map((r) => [r.id, r]));
  const reviews = new Map(Object.entries(opts.reviews ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const out = new Map<number, Repo>();

  // 2. Filter, classify and merge history.
  for (const { repo, hinted, trusted } of candidates.values()) {
    const reason = rejectReason(repo, blocklist);
    if (reason) {
      reject(reason);
      continue;
    }
    const categories = classify(repo, rules, { hinted, trusted });
    if (categories.length === 0) {
      reject('irrelevant');
      continue;
    }
    const prev = previousById.get(repo.id);
    const review = reviews.get(repo.fullName.toLowerCase());
    out.set(repo.id, {
      id: repo.id,
      fullName: repo.fullName,
      owner: repo.owner,
      name: repo.name,
      url: repo.url,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      openIssues: repo.openIssues,
      topics: repo.topics,
      license: repo.license,
      createdAt: repo.createdAt,
      pushedAt: repo.pushedAt,
      updatedAt: repo.updatedAt,
      firstSeen: prev?.firstSeen ?? nowIso,
      lastSeen: nowIso,
      categories,
      flags: detectFlags(repo),
      ...(review ? { review } : {}),
    });
  }

  // 3. Retain recently-seen repos that this run did not return (search results fluctuate),
  //    unless they are now blocked. Their metrics are labelled with lastSeen in the UI.
  for (const prev of previousById.values()) {
    if (out.has(prev.id)) continue;
    if (opts.now.getTime() - new Date(prev.lastSeen).getTime() > retainMs) continue;
    const owner = prev.owner.toLowerCase();
    if (blocklist.owners.has(owner) || blocklist.repos.has(prev.fullName.toLowerCase())) continue;
    if (blocklist.patterns.some((re) => re.test(`${prev.name} ${prev.description ?? ''}`))) continue;
    const review = reviews.get(prev.fullName.toLowerCase());
    const { review: _old, ...rest } = prev;
    void _old;
    out.set(prev.id, { ...rest, ...(review ? { review } : {}) });
    stats.retained++;
  }

  // 4. Size cap. Repos visible in some tab are kept first; within each group, newest first.
  const nowMs = opts.now.getTime();
  const priority = (r: Repo) => {
    const created = (nowMs - new Date(r.createdAt).getTime()) / 86_400_000;
    const pushed = (nowMs - new Date(r.pushedAt).getTime()) / 86_400_000;
    if (created <= 30 || pushed <= 7 || (created <= 90 && r.stars >= 5)) return 0;
    return 1;
  };
  const repos = [...out.values()]
    .sort((a, b) => priority(a) - priority(b) || b.createdAt.localeCompare(a.createdAt) || a.id - b.id)
    .slice(0, maxRepos)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id - b.id);
  stats.kept = repos.length;
  return { repos, stats };
}

export const RECENT_DAYS = 7;

/** Repos created in the last `days` days, for the fast first load (recent.json). */
export function recentSubset(dataset: Dataset, days: number = RECENT_DAYS): Dataset {
  const cutoff = new Date(dataset.meta.generatedAt).getTime() - days * 86_400_000;
  return {
    meta: { ...dataset.meta, subset: { kind: 'recent', days } },
    repos: dataset.repos.filter((r) => new Date(r.createdAt).getTime() >= cutoff),
  };
}
