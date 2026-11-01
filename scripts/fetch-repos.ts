/**
 * Data pipeline: queries the GitHub REST Search API and writes public/data/repos.json.
 *
 * Runs in GitHub Actions every ~3 hours. It only reads repository METADATA from the API —
 * it never clones, installs or executes anything from the discovered repositories.
 *
 * Env:
 *   GITHUB_TOKEN        token for the Search API (Actions' built-in token is enough). Optional locally.
 *   PREVIOUS_DATA_URL   URL of the currently published repos.json, used to keep `firstSeen` history.
 *   OUTPUT              output path (default public/data/repos.json); recent.json is written next to it
 *   MAX_QUERIES         only run the first N queries (handy for local testing without a token)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import queriesConfig from '../config/queries.json';
import reviewsConfig from '../config/reviews.json';
import { buildRepos, recentSubset, RECENT_DAYS, type QueryResult } from '../src/lib/pipeline';
import { resolveQueries, type QueriesConfig } from '../src/lib/queries';
import { parseReviews, type ReviewsConfig } from '../src/lib/reviews';
import type { Dataset, Repo } from '../src/lib/types';
import { createClient, GitHubError } from './lib/github';

const OUTPUT = process.env.OUTPUT || 'public/data/repos.json';
const MAX_FAILED_RATIO = 0.5;
const SEARCH_RESULT_CAP = 1000;

const log = (msg: string) => console.log(msg);

function isDataset(value: unknown): value is Dataset {
  const d = value as Dataset;
  return Boolean(d && d.meta && d.meta.schemaVersion === 1 && Array.isArray(d.repos));
}

async function loadPrevious(): Promise<Repo[]> {
  const url = process.env.PREVIOUS_DATA_URL;
  if (url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data: unknown = await res.json();
        if (isDataset(data) && !data.meta.demo) {
          log(`Previous dataset: ${data.repos.length} repos from ${url}`);
          return data.repos;
        }
        log(`Previous dataset at ${url} is not a valid real dataset; ignoring.`);
      } else {
        log(`Previous dataset not available (${res.status}) at ${url}.`);
      }
    } catch (err) {
      log(`Could not load previous dataset: ${(err as Error).message}`);
    }
  }
  try {
    const data: unknown = JSON.parse(await readFile(OUTPUT, 'utf8'));
    if (isDataset(data) && !data.meta.demo) {
      log(`Previous dataset: ${data.repos.length} repos from local ${OUTPUT}`);
      return data.repos;
    }
  } catch {
    /* no local file */
  }
  return [];
}

async function main() {
  const now = new Date();
  const token = process.env.GITHUB_TOKEN || undefined;
  if (!token) log('⚠ GITHUB_TOKEN not set: using unauthenticated requests (10 searches/minute).');

  let queries = resolveQueries(queriesConfig as QueriesConfig, now);
  const maxQueries = Number(process.env.MAX_QUERIES);
  if (Number.isFinite(maxQueries) && maxQueries > 0) queries = queries.slice(0, maxQueries);

  const { reviews, errors: reviewErrors } = parseReviews(reviewsConfig as ReviewsConfig);
  for (const e of reviewErrors) log(`⚠ reviews.json: ${e}`);

  const client = createClient({ token, log });
  const results: QueryResult[] = [];
  const notes: string[] = [];
  let failed = 0;

  for (const [i, query] of queries.entries()) {
    log(`[${i + 1}/${queries.length}] ${query.id}: ${query.q} (sort=${query.sort}, pages<=${query.pages})`);
    const items: QueryResult['items'] = [];
    try {
      for (let page = 1; page <= query.pages; page++) {
        const res = await client.searchRepositories(query.q, query.sort, page);
        items.push(...res.items);
        if (res.incomplete_results) notes.push(`Query "${query.id}" returned incomplete results (GitHub search timeout).`);
        const available = Math.min(res.total_count, SEARCH_RESULT_CAP);
        log(`  page ${page}: ${res.items.length} items (total_count=${res.total_count})`);
        if (res.items.length < 100 || page * 100 >= available) break;
      }
      results.push({ queryId: query.id, category: query.category, trust: query.trust, items });
    } catch (err) {
      failed++;
      const status = err instanceof GitHubError ? err.status : null;
      log(`  ✗ failed${status ? ` (${status})` : ''}: ${(err as Error).message}`);
      // Keep partial pages if we got some.
      if (items.length) results.push({ queryId: query.id, category: query.category, trust: query.trust, items });
    }
  }

  if (queries.length === 0 || failed / queries.length > MAX_FAILED_RATIO) {
    console.error(`✗ ${failed}/${queries.length} queries failed. Not writing a new dataset; the previous deployment stays online.`);
    process.exit(1);
  }

  const previous = await loadPrevious();
  const { repos, stats } = buildRepos(results, { now, previous, reviews });
  if (failed > 0) notes.push(`${failed} of ${queries.length} queries failed in this sync; results may be incomplete.`);

  const dataset: Dataset = {
    meta: {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      demo: false,
      queriesTotal: queries.length,
      queriesFailed: failed,
      itemsFetched: stats.itemsFetched,
      repoCount: repos.length,
      partial: failed > 0,
      notes,
    },
    repos,
  };

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(dataset));
  // Small file with the last 7 days only, so the first paint does not wait for the full dataset.
  const recent = recentSubset(dataset, RECENT_DAYS);
  await writeFile(join(dirname(OUTPUT), 'recent.json'), JSON.stringify(recent));
  log(`✓ Wrote ${recent.repos.length} repos to recent.json`);
  log(
    `✓ Wrote ${repos.length} repos to ${OUTPUT} — fetched ${stats.itemsFetched}, unique ${stats.unique}, ` +
      `retained ${stats.retained}, rejected ${JSON.stringify(stats.rejected)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
