import type { Review } from './types';

export interface ReviewsConfig {
  allowedHosts: string[];
  reviews: Record<string, { url?: unknown; title?: unknown }>;
}

const REPO_KEY = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;

/** Validates review entries; invalid ones are dropped and reported. */
export function parseReviews(config: ReviewsConfig): { reviews: Record<string, Review>; errors: string[] } {
  const hosts = config.allowedHosts.map((h) => h.toLowerCase());
  const reviews: Record<string, Review> = {};
  const errors: string[] = [];
  for (const [key, entry] of Object.entries(config.reviews ?? {})) {
    if (!REPO_KEY.test(key)) {
      errors.push(`invalid repo key "${key}"`);
      continue;
    }
    const title = typeof entry?.title === 'string' ? entry.title.trim().slice(0, 140) : '';
    let url: URL | null = null;
    try {
      url = typeof entry?.url === 'string' ? new URL(entry.url) : null;
    } catch {
      url = null;
    }
    const host = url?.hostname.toLowerCase() ?? '';
    const hostOk = hosts.some((h) => host === h || host.endsWith(`.${h}`));
    if (!url || url.protocol !== 'https:' || !hostOk || !title) {
      errors.push(`invalid review for "${key}" (needs https URL on ${hosts.join(', ')} and a title)`);
      continue;
    }
    reviews[key] = { url: url.toString(), title };
  }
  return { reviews, errors };
}
