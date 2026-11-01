/**
 * Minimal GitHub REST Search API client with rate-limit handling.
 * - Authenticated search allows 30 requests/minute; we pace requests below that.
 * - 403/429: honours Retry-After and X-RateLimit-Reset, otherwise exponential backoff.
 * - Network errors and 5xx: exponential backoff.
 * - 422 (invalid query): not retried.
 */
import type { GitHubRepoItem } from '../../src/lib/types';

export interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepoItem[];
}

export interface ClientOptions {
  token?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Minimum delay between requests (ms). */
  minIntervalMs?: number;
  maxRetries?: number;
  /** Never wait longer than this for a single rate-limit reset (ms). */
  maxWaitMs?: number;
  log?: (msg: string) => void;
  userAgent?: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createClient(opts: ClientOptions = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? realSleep;
  const now = opts.now ?? Date.now;
  const minInterval = opts.minIntervalMs ?? (opts.token ? 2_200 : 6_500);
  const maxRetries = opts.maxRetries ?? 4;
  const maxWait = opts.maxWaitMs ?? 90_000;
  const log = opts.log ?? (() => {});
  let lastRequest = 0;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': opts.userAgent ?? 'cyber-repo-radar',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  /** How long to wait before retrying a rate-limited response, or null if unknown. */
  function rateLimitWait(res: Response): number | null {
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter && /^\d+$/.test(retryAfter)) return Number(retryAfter) * 1000;
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      if (Number.isFinite(reset) && reset > 0) return Math.max(0, reset * 1000 - now()) + 1000;
    }
    return null;
  }

  async function request(url: string): Promise<unknown> {
    let attempt = 0;
    for (;;) {
      const wait = lastRequest + minInterval - now();
      if (wait > 0) await sleep(wait);
      lastRequest = now();

      let res: Response;
      try {
        res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(30_000) });
      } catch (err) {
        if (attempt >= maxRetries) throw new GitHubError(`Network error: ${(err as Error).message}`, null, true);
        const backoff = 2 ** attempt * 2_000;
        log(`  network error (${(err as Error).message}); retrying in ${backoff / 1000}s`);
        await sleep(backoff);
        attempt++;
        continue;
      }

      if (res.ok) return res.json();

      const body = await res.text().catch(() => '');
      const short = body.slice(0, 200).replace(/\s+/g, ' ');

      if (res.status === 403 || res.status === 429) {
        if (attempt >= maxRetries) throw new GitHubError(`Rate limited (${res.status}): ${short}`, res.status, true);
        const known = rateLimitWait(res);
        const delay = Math.min(maxWait, known ?? 2 ** attempt * 15_000);
        if (known !== null && known > maxWait) {
          throw new GitHubError(`Rate limit resets in ${Math.round(known / 1000)}s, longer than allowed wait`, res.status, true);
        }
        log(`  ${res.status} rate limited; waiting ${Math.round(delay / 1000)}s`);
        await sleep(delay);
        attempt++;
        continue;
      }

      if (res.status >= 500) {
        if (attempt >= maxRetries) throw new GitHubError(`Server error ${res.status}: ${short}`, res.status, true);
        const backoff = 2 ** attempt * 3_000;
        log(`  ${res.status} server error; retrying in ${backoff / 1000}s`);
        await sleep(backoff);
        attempt++;
        continue;
      }

      // 401, 404, 422 and others: not retryable.
      throw new GitHubError(`HTTP ${res.status}: ${short}`, res.status, false);
    }
  }

  async function searchRepositories(q: string, sort: string, page: number, perPage = 100): Promise<SearchResponse> {
    const params = new URLSearchParams({ q, sort, order: 'desc', per_page: String(perPage), page: String(page) });
    const data = (await request(`https://api.github.com/search/repositories?${params}`)) as SearchResponse;
    if (!data || !Array.isArray(data.items)) throw new GitHubError('Unexpected response shape', 200, false);
    return data;
  }

  return { searchRepositories };
}
