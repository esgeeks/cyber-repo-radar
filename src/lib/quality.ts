import blocklistConfig from '../../config/blocklist.json';
import type { NormalizedRepo } from './normalize';

export interface Blocklist {
  owners: string[];
  repos: string[];
  descriptionPatterns: string[];
}

export interface CompiledBlocklist {
  owners: Set<string>;
  repos: Set<string>;
  patterns: RegExp[];
}

export function compileBlocklist(list: Blocklist): CompiledBlocklist {
  return {
    owners: new Set(list.owners.map((o) => o.toLowerCase())),
    repos: new Set(list.repos.map((r) => r.toLowerCase())),
    patterns: list.descriptionPatterns.map((p) => new RegExp(p, 'i')),
  };
}

export const DEFAULT_BLOCKLIST = compileBlocklist(blocklistConfig as Blocklist);

export type RejectReason =
  | 'not-public'
  | 'fork'
  | 'archived'
  | 'disabled'
  | 'no-metadata'
  | 'blocked-owner'
  | 'blocked-repo'
  | 'spam-pattern';

/**
 * Basic hygiene and anti-spam checks. Returns the reason a repo should be discarded, or null to keep it.
 * This reduces noise but cannot guarantee a repository is safe — the UI always shows a security warning.
 */
export function rejectReason(repo: NormalizedRepo, blocklist: CompiledBlocklist = DEFAULT_BLOCKLIST): RejectReason | null {
  if (!repo.isPublic) return 'not-public';
  if (repo.fork) return 'fork';
  if (repo.archived) return 'archived';
  if (repo.disabled) return 'disabled';
  if (!repo.description && repo.topics.length === 0) return 'no-metadata';
  if (blocklist.owners.has(repo.owner.toLowerCase())) return 'blocked-owner';
  if (blocklist.repos.has(repo.fullName.toLowerCase())) return 'blocked-repo';
  const text = `${repo.name} ${repo.description ?? ''}`;
  if (blocklist.patterns.some((re) => re.test(text))) return 'spam-pattern';
  return null;
}
