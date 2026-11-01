import type { GitHubRepoItem } from './types';

export interface NormalizedRepo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  topics: string[];
  license: string | null;
  createdAt: string;
  pushedAt: string;
  updatedAt: string;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  isPublic: boolean;
}

export const MAX_DESCRIPTION_LENGTH = 300;

// Control characters (except normal whitespace, which is collapsed anyway) and
// bidi override characters that can be abused to spoof text.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

export function cleanText(input: string | null | undefined, maxLength = MAX_DESCRIPTION_LENGTH): string | null {
  if (input == null) return null;
  const cleaned = input.replace(UNSAFE_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeTopics(topics: readonly string[] | undefined): string[] {
  if (!topics) return [];
  const seen = new Set<string>();
  for (const raw of topics) {
    const t = raw.trim().toLowerCase();
    if (t && /^[a-z0-9][a-z0-9-]{0,49}$/.test(t)) seen.add(t);
  }
  return [...seen].sort();
}

export function normalizeLicense(license: GitHubRepoItem['license']): string | null {
  if (!license) return null;
  const id = license.spdx_id?.trim();
  if (!id || id === 'NOASSERTION') return 'Other';
  return id;
}

function toIso(value: string | null | undefined, fallback: string): string {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : fallback;
}

/** Owner/name as GitHub allows them; anything else is rejected. */
const NAME_RE = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Converts a raw GitHub API item into our normalized shape.
 * Returns null for items that are malformed or do not point to a public github.com repository.
 */
export function normalizeRepo(item: GitHubRepoItem): NormalizedRepo | null {
  if (!item || typeof item.id !== 'number' || !item.full_name) return null;
  const [owner, name, ...rest] = item.full_name.split('/');
  if (!owner || !name || rest.length > 0 || !NAME_RE.test(owner) || !NAME_RE.test(name)) return null;

  // Build the link ourselves instead of trusting html_url, so it can only ever point to github.com.
  const url = `https://github.com/${owner}/${name}`;
  if (item.html_url && item.html_url.toLowerCase() !== url.toLowerCase()) return null;

  const createdAt = toIso(item.created_at, '');
  if (!createdAt) return null;
  const updatedAt = toIso(item.updated_at, createdAt);

  return {
    id: item.id,
    fullName: `${owner}/${name}`,
    owner,
    name,
    url,
    description: cleanText(item.description),
    language: cleanText(item.language, 40),
    stars: Math.max(0, Math.trunc(item.stargazers_count || 0)),
    forks: Math.max(0, Math.trunc(item.forks_count || 0)),
    openIssues: Math.max(0, Math.trunc(item.open_issues_count || 0)),
    topics: normalizeTopics(item.topics),
    license: normalizeLicense(item.license),
    createdAt,
    pushedAt: toIso(item.pushed_at, createdAt),
    updatedAt,
    fork: Boolean(item.fork),
    archived: Boolean(item.archived),
    disabled: Boolean(item.disabled),
    isPublic: item.private !== true && (item.visibility === undefined || item.visibility === 'public'),
  };
}
