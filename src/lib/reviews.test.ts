import { describe, expect, it } from 'vitest';
import { parseReviews } from './reviews';

describe('parseReviews', () => {
  it('accepts https URLs on allowed hosts and subdomains', () => {
    const { reviews, errors } = parseReviews({
      allowedHosts: ['esgeeks.com'],
      reviews: { 'acme/tool': { url: 'https://www.esgeeks.com/tool/', title: 'Tool review' } },
    });
    expect(errors).toEqual([]);
    expect(reviews['acme/tool']).toEqual({ url: 'https://www.esgeeks.com/tool/', title: 'Tool review' });
  });

  it('rejects other hosts, http, javascript: URLs, bad keys and missing titles', () => {
    const { reviews, errors } = parseReviews({
      allowedHosts: ['esgeeks.com'],
      reviews: {
        'a/b': { url: 'https://evil-esgeeks.com/x', title: 't' },
        'c/d': { url: 'http://esgeeks.com/x', title: 't' },
        'e/f': { url: 'javascript:alert(1)', title: 't' },
        'bad key': { url: 'https://esgeeks.com/x', title: 't' },
        'g/h': { url: 'https://esgeeks.com/x' },
      },
    });
    expect(reviews).toEqual({});
    expect(errors).toHaveLength(5);
  });
});
