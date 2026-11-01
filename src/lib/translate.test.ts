import { describe, expect, it } from 'vitest';
import { pickSource, translationSupported, withTimeout } from './translate';

describe('translation helpers', () => {
  it('chooses the detected language unless it is already Spanish or uncertain', () => {
    expect(pickSource([{ detectedLanguage: 'en', confidence: 0.95 }])).toBe('en');
    expect(pickSource([{ detectedLanguage: 'zh-Hans', confidence: 0.9 }])).toBe('zh');
    expect(pickSource([{ detectedLanguage: 'es', confidence: 0.99 }])).toBeNull();
    expect(pickSource([{ detectedLanguage: 'en', confidence: 0.3 }])).toBeNull();
    expect(pickSource([{ detectedLanguage: 'und', confidence: 0.9 }])).toBeNull();
    expect(pickSource([])).toBeNull();
  });
  it('assumes English when there is no language detector', () => {
    expect(pickSource(null)).toBe('en');
  });
  it('reports no support outside Chrome', () => {
    expect(translationSupported()).toBe(false);
  });
});

describe('withTimeout', () => {
  it('resolves fast promises and rejects hanging ones', async () => {
    await expect(withTimeout(Promise.resolve(1), 50)).resolves.toBe(1);
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow('timeout');
  });
});
