import { describe, expect, it } from 'vitest';
import { classify, detectFlags, matchesKeyword, normalizeName, scoreCategories } from './classify';

const repo = (name: string, description: string | null = null, topics: string[] = []) => ({ name, description, topics });

describe('normalizeName', () => {
  it('splits camelCase, dashes, underscores and dots', () => {
    expect(normalizeName('AI-PentestAgent_v2.0')).toBe('ai pentest agent v2 0');
    expect(normalizeName('OSINTFramework')).toBe('osint framework');
  });
});

describe('matchesKeyword', () => {
  it('matches whole words only', () => {
    expect(matchesKeyword('a recon tool', 'recon')).toBe(true);
    expect(matchesKeyword('reconcile accounts', 'recon')).toBe(false);
  });
  it('treats spaces and hyphens as equivalent', () => {
    expect(matchesKeyword('a red-team toolkit', 'red team')).toBe(true);
  });
});

describe('scoreCategories', () => {
  it('weights topics > name > description', () => {
    expect(scoreCategories(repo('x', null, ['osint'])).get('osint')).toBe(3);
    expect(scoreCategories(repo('osint-kit')).get('osint')).toBe(2);
    expect(scoreCategories(repo('x', 'an osint helper')).get('osint')).toBe(1);
  });
  it('adds query hints', () => {
    expect(scoreCategories(repo('x', 'an osint helper'), undefined, { hinted: ['osint'] }).get('osint')).toBe(2);
    expect(scoreCategories(repo('x'), undefined, { trusted: ['ai-security'] }).get('ai-security')).toBe(2);
  });
});

describe('classify', () => {
  it('assigns multiple categories, best first', () => {
    const cats = classify(repo('subdomain-recon', 'Subdomain enumeration for bug bounty hunters', ['bug-bounty', 'osint']));
    // osint: topic (3) + "recon" in name (2) = 5; bug-bounty: topic (3) + description (1) = 4
    expect(cats.slice(0, 2)).toEqual(['osint', 'bug-bounty']);
  });
  it('puts the generic cybersecurity category last', () => {
    const cats = classify(repo('x', null, ['cybersecurity', 'malware-analysis']));
    expect(cats).toEqual(['malware-analysis', 'cybersecurity']);
  });
  it('returns [] for irrelevant repositories', () => {
    expect(classify(repo('todo-app', 'A simple todo list in React', ['react']))).toEqual([]);
  });
  it('does not classify on a single weak description match', () => {
    expect(classify(repo('dashboard', 'Shows sandbox metrics'))).toEqual([]);
  });
  it('detects AI security repositories', () => {
    expect(classify(repo('autonomous-pentest-agent', 'LLM driven autonomous pentesting'))).toContain('ai-security');
    expect(classify(repo('x', null, ['prompt-injection']))).toEqual(['ai-security']);
  });
});

describe('detectFlags', () => {
  it('flags CVE PoCs and exploits', () => {
    expect(detectFlags(repo('CVE-2026-12345', null))).toEqual(['poc']);
    expect(detectFlags(repo('tool', 'Proof of concept for a bug'))).toEqual(['poc']);
    expect(detectFlags(repo('x', null, ['exploit']))).toEqual(['poc']);
  });
  it('does not flag unrelated words', () => {
    expect(detectFlags(repo('pocket-scanner', 'Exploitation-free hardening checks'))).toEqual([]);
  });
});
