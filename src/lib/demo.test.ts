import { describe, expect, it } from 'vitest';
import demo from '../../public/data/demo.json';
import { isDataset } from '../hooks/useDataset';
import type { Dataset } from './types';

describe('demo dataset', () => {
  const data = demo as Dataset;
  it('is a valid dataset explicitly marked as demo', () => {
    expect(isDataset(data)).toBe(true);
    expect(data.meta.demo).toBe(true);
  });
  it('is clearly fictional and never links to real repositories', () => {
    for (const r of data.repos) {
      expect(r.owner).toBe('demo-ficticio');
      expect(r.name.startsWith('ficticio-')).toBe(true);
      expect(r.description?.startsWith('[DEMO]')).toBe(true);
      expect(new URL(r.url).hostname.endsWith('.invalid')).toBe(true);
    }
  });
  it('covers every tab', () => {
    expect(data.repos.length).toBeGreaterThan(20);
  });
});
