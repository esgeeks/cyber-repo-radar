/**
 * Shared data model. Used by the data pipeline (scripts/) and the frontend (src/).
 * Every field comes from the GitHub REST Search API or is derived from it —
 * nothing is invented.
 */

export const CATEGORY_IDS = [
  'cybersecurity',
  'ethical-hacking',
  'pentesting',
  'osint',
  'threat-intelligence',
  'malware-analysis',
  'reverse-engineering',
  'digital-forensics',
  'blue-team',
  'red-team',
  'bug-bounty',
  'cloud-security',
  'web-security',
  'ai-security',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type RepoFlag = 'poc';

export interface Review {
  url: string;
  title: string;
}

export interface Repo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  /** Always https://github.com/<owner>/<name> for real data. */
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  topics: string[];
  /** SPDX id (e.g. "MIT") or "Other"; null when the repo declares no license. */
  license: string | null;
  /** When the repository was created on GitHub. */
  createdAt: string;
  /** Last push to any branch — the best signal of real activity. */
  pushedAt: string;
  /** Last change to the repository metadata (stars, description...). */
  updatedAt: string;
  /** First time this radar saw the repository. */
  firstSeen: string;
  /** Last sync in which this repository was returned by the API (metrics are as of this time). */
  lastSeen: string;
  categories: CategoryId[];
  flags: RepoFlag[];
  review?: Review;
}

export interface DatasetMeta {
  schemaVersion: 1;
  generatedAt: string;
  demo: boolean;
  queriesTotal: number;
  queriesFailed: number;
  /** Raw items returned by the API before deduplication and filtering. */
  itemsFetched: number;
  repoCount: number;
  partial: boolean;
  notes: string[];
  /** Present on recent.json: only repos created in the last `days` days (fast first load). */
  subset?: { kind: 'recent'; days: number };
}

export interface Dataset {
  meta: DatasetMeta;
  repos: Repo[];
}

/** Subset of the GitHub Search API repository item that we consume. */
export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived?: boolean;
  disabled?: boolean;
  private?: boolean;
  visibility?: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
  license: { spdx_id: string | null; name?: string | null } | null;
  created_at: string;
  pushed_at: string | null;
  updated_at: string;
  owner: { login: string } | null;
}
