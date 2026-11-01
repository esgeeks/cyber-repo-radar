import { describe, expect, it } from 'vitest';
import { makeItem } from '../test/factories';
import { normalizeRepo } from './normalize';
import { compileBlocklist, rejectReason } from './quality';

const n = (o: Parameters<typeof makeItem>[0]) => normalizeRepo(makeItem(o))!;

describe('rejectReason', () => {
  it('keeps a normal repository', () => {
    expect(rejectReason(n({}))).toBeNull();
  });
  it('rejects forks, archived, disabled and private repos', () => {
    expect(rejectReason(n({ fork: true }))).toBe('fork');
    expect(rejectReason(n({ archived: true }))).toBe('archived');
    expect(rejectReason(n({ disabled: true }))).toBe('disabled');
    expect(rejectReason(n({ private: true }))).toBe('not-public');
  });
  it('rejects repos with neither description nor topics', () => {
    expect(rejectReason(n({ description: null, topics: [] }))).toBe('no-metadata');
  });
  it('rejects typical spam', () => {
    expect(rejectReason(n({ description: 'FREE Robux generator 2026' }))).toBe('spam-pattern');
    expect(rejectReason(n({ description: 'Discord token grabber' }))).toBe('spam-pattern');
    expect(rejectReason(n({ description: 'Hack any Instagram account password' }))).toBe('spam-pattern');
  });
  it('does not reject legitimate security tools with similar words', () => {
    expect(rejectReason(n({ description: 'ARP spoofer for network pentest labs' }))).toBeNull();
    expect(rejectReason(n({ description: 'Crack password hashes with GPU acceleration' }))).toBeNull();
  });
  it('applies owner and repo blocklists case-insensitively', () => {
    const bl = compileBlocklist({ owners: ['BadGuy'], repos: ['acme/Evil'], descriptionPatterns: [] });
    expect(rejectReason(n({ full_name: 'badguy/tool' }), bl)).toBe('blocked-owner');
    expect(rejectReason(n({ full_name: 'acme/evil' }), bl)).toBe('blocked-repo');
  });
});
