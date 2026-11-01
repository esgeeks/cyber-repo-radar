import { describe, expect, it, vi } from 'vitest';
import { createClient, GitHubError } from './github';

const ok = (items: unknown[] = []) => new Response(JSON.stringify({ total_count: items.length, incomplete_results: false, items }), { status: 200 });
const status = (code: number, headers: Record<string, string> = {}) => new Response('{"message":"x"}', { status: code, headers });

function setup(responses: (Response | Error)[]) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const sleeps: number[] = [];
  let clock = 1_000_000;
  const client = createClient({
    token: 't',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    minIntervalMs: 0,
  });
  return { client, fetchImpl, sleeps };
}

describe('GitHub client', () => {
  it('sends auth and API version headers', async () => {
    const { client, fetchImpl } = setup([ok()]);
    await client.searchRepositories('topic:osint', 'stars', 1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('q=topic%3Aosint');
    expect(url).toContain('per_page=100');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t');
    expect((init.headers as Record<string, string>)['X-GitHub-Api-Version']).toBe('2022-11-28');
  });

  it('honours Retry-After on 429', async () => {
    const { client, sleeps } = setup([status(429, { 'retry-after': '7' }), ok()]);
    await client.searchRepositories('q', 'stars', 1);
    expect(sleeps).toContain(7000);
  });

  it('waits for X-RateLimit-Reset on 403 with remaining=0', async () => {
    const reset = Math.floor(1_000_000 / 1000) + 20; // 20 s after the fake clock
    const { client, sleeps } = setup([status(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) }), ok()]);
    await client.searchRepositories('q', 'stars', 1);
    expect(sleeps.some((s) => s >= 20_000 && s <= 22_000)).toBe(true);
  });

  it('backs off exponentially on secondary rate limits without headers', async () => {
    const { client, sleeps } = setup([status(403), status(403), ok()]);
    await client.searchRepositories('q', 'stars', 1);
    expect(sleeps).toEqual([15_000, 30_000]);
  });

  it('retries network errors and 5xx', async () => {
    const { client, fetchImpl } = setup([new TypeError('fetch failed'), status(502), ok()]);
    await client.searchRepositories('q', 'stars', 1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('gives up after maxRetries', async () => {
    const { client } = setup([status(429), status(429), status(429), status(429), status(429)]);
    await expect(client.searchRepositories('q', 'stars', 1)).rejects.toBeInstanceOf(GitHubError);
  });

  it('does not retry 422 invalid queries', async () => {
    const { client, fetchImpl } = setup([status(422)]);
    await expect(client.searchRepositories('q', 'stars', 1)).rejects.toMatchObject({ status: 422, retryable: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses to wait longer than maxWaitMs for a reset', async () => {
    const { client } = setup([status(429, { 'retry-after': '3600' })]);
    await expect(client.searchRepositories('q', 'stars', 1)).rejects.toThrow(/longer than allowed/);
  });
});
