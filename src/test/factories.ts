import type { GitHubRepoItem, Repo } from '../lib/types';

let seq = 1;

export function makeItem(overrides: Partial<GitHubRepoItem> = {}): GitHubRepoItem {
  const id = overrides.id ?? seq++;
  const fullName = overrides.full_name ?? `owner${id}/repo${id}`;
  return {
    id,
    name: fullName.split('/')[1]!,
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    description: 'An OSINT reconnaissance tool',
    fork: false,
    archived: false,
    disabled: false,
    private: false,
    visibility: 'public',
    language: 'Python',
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 1,
    topics: ['osint'],
    license: { spdx_id: 'MIT', name: 'MIT License' },
    created_at: '2026-10-30T10:00:00Z',
    pushed_at: '2026-10-31T10:00:00Z',
    updated_at: '2026-10-31T11:00:00Z',
    owner: { login: fullName.split('/')[0]! },
    ...overrides,
  };
}

export function makeRepo(overrides: Partial<Repo> = {}): Repo {
  const id = overrides.id ?? seq++;
  const owner = overrides.owner ?? `owner${id}`;
  const name = overrides.name ?? `repo${id}`;
  return {
    id,
    fullName: `${owner}/${name}`,
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
    description: 'Security tool',
    language: 'Python',
    stars: 10,
    forks: 1,
    openIssues: 0,
    topics: ['security'],
    license: 'MIT',
    createdAt: '2026-10-30T00:00:00.000Z',
    pushedAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
    firstSeen: '2026-10-30T03:00:00.000Z',
    lastSeen: '2026-11-01T00:00:00.000Z',
    categories: ['cybersecurity'],
    flags: [],
    ...overrides,
  };
}
