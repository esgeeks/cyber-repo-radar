/**
 * Generates public/data/demo.json: a clearly FICTIONAL dataset to try the UI offline.
 * - Owner is always "demo-ficticio", names start with "ficticio-", descriptions start with "[DEMO]".
 * - URLs use the reserved .invalid TLD (RFC 2606), which can never resolve; the UI also disables links.
 * - Metrics are made up and must never be presented as real.
 */
import { writeFile } from 'node:fs/promises';
import type { CategoryId, Dataset, Repo } from '../src/lib/types';

const GENERATED_AT = new Date('2026-11-01T12:00:00.000Z');
const H = 3_600_000;

interface Seed {
  name: string;
  desc: string;
  lang: string | null;
  cats: CategoryId[];
  topics: string[];
  stars: number;
  forks: number;
  createdHoursAgo: number;
  pushedHoursAgo: number;
  license?: string | null;
  poc?: boolean;
}

const seeds: Seed[] = [
  { name: 'recon-sweeper', desc: 'Fictional subdomain and port reconnaissance pipeline for demo purposes.', lang: 'Go', cats: ['osint', 'bug-bounty'], topics: ['osint', 'recon', 'bug-bounty'], stars: 42, forks: 5, createdHoursAgo: 3, pushedHoursAgo: 1 },
  { name: 'llm-guard-probe', desc: 'Fictional prompt injection test harness for LLM apps.', lang: 'Python', cats: ['ai-security'], topics: ['llm-security', 'prompt-injection'], stars: 128, forks: 14, createdHoursAgo: 9, pushedHoursAgo: 2 },
  { name: 'agentic-pentest-lab', desc: 'Fictional autonomous pentest agent lab environment.', lang: 'TypeScript', cats: ['ai-security', 'pentesting'], topics: ['ai-pentest', 'pentesting', 'agents'], stars: 310, forks: 33, createdHoursAgo: 20, pushedHoursAgo: 4 },
  { name: 'sigma-pack-mini', desc: 'Fictional collection of detection rules for a SIEM demo.', lang: 'YARA', cats: ['blue-team', 'threat-intelligence'], topics: ['sigma-rules', 'detection-engineering'], stars: 18, forks: 2, createdHoursAgo: 30, pushedHoursAgo: 6 },
  { name: 'cve-2026-00000-poc', desc: 'Fictional proof of concept to show the PoC warning badge. Not a real CVE.', lang: 'Python', cats: ['pentesting'], topics: ['cve', 'exploit', 'poc'], stars: 77, forks: 21, createdHoursAgo: 40, pushedHoursAgo: 40, poc: true },
  { name: 'mem-triage-kit', desc: 'Fictional memory forensics triage helpers.', lang: 'Rust', cats: ['digital-forensics'], topics: ['dfir', 'memory-forensics'], stars: 56, forks: 4, createdHoursAgo: 60, pushedHoursAgo: 12 },
  { name: 'cloud-iam-lens', desc: 'Fictional IAM misconfiguration explorer for cloud accounts.', lang: 'Go', cats: ['cloud-security'], topics: ['cloud-security', 'aws-security', 'iam'], stars: 204, forks: 19, createdHoursAgo: 80, pushedHoursAgo: 10 },
  { name: 'xss-lab-arena', desc: 'Fictional deliberately vulnerable web app for XSS practice.', lang: 'JavaScript', cats: ['web-security', 'ethical-hacking'], topics: ['xss', 'web-security', 'ctf'], stars: 35, forks: 9, createdHoursAgo: 100, pushedHoursAgo: 50 },
  { name: 'ghidra-notes-helper', desc: 'Fictional plugin that annotates functions during reverse engineering.', lang: 'Java', cats: ['reverse-engineering'], topics: ['ghidra', 'reverse-engineering'], stars: 89, forks: 7, createdHoursAgo: 130, pushedHoursAgo: 30 },
  { name: 'c2-sim-lite', desc: 'Fictional command and control simulator for adversary emulation training.', lang: 'C#', cats: ['red-team'], topics: ['red-team', 'c2', 'adversary-emulation'], stars: 450, forks: 61, createdHoursAgo: 150, pushedHoursAgo: 8 },
  { name: 'ioc-feed-normalizer', desc: 'Fictional threat intelligence feed normalizer (STIX in, CSV out).', lang: 'Python', cats: ['threat-intelligence'], topics: ['threat-intelligence', 'stix', 'ioc'], stars: 23, forks: 3, createdHoursAgo: 200, pushedHoursAgo: 90 },
  { name: 'sandbox-report-viewer', desc: 'Fictional viewer for malware sandbox reports.', lang: 'Vue', cats: ['malware-analysis'], topics: ['malware-analysis', 'sandbox'], stars: 61, forks: 6, createdHoursAgo: 260, pushedHoursAgo: 100 },
  { name: 'username-hunter-demo', desc: 'Fictional username search across public profiles.', lang: 'Python', cats: ['osint'], topics: ['osint', 'socmint'], stars: 512, forks: 70, createdHoursAgo: 300, pushedHoursAgo: 20 },
  { name: 'k8s-policy-audit', desc: 'Fictional Kubernetes security policy auditor.', lang: 'Go', cats: ['cloud-security', 'blue-team'], topics: ['kubernetes-security', 'hardening'], stars: 140, forks: 11, createdHoursAgo: 380, pushedHoursAgo: 60 },
  { name: 'burp-ext-sample', desc: 'Fictional Burp Suite extension that highlights interesting parameters.', lang: 'Kotlin', cats: ['web-security', 'bug-bounty'], topics: ['burp-extensions', 'bug-bounty'], stars: 74, forks: 8, createdHoursAgo: 450, pushedHoursAgo: 200 },
  { name: 'ad-path-mapper', desc: 'Fictional Active Directory attack path visualizer.', lang: 'TypeScript', cats: ['pentesting', 'red-team'], topics: ['active-directory', 'pentesting'], stars: 890, forks: 102, createdHoursAgo: 520, pushedHoursAgo: 5 },
  { name: 'ctf-toolbox-demo', desc: 'Fictional bundle of small CTF helper scripts.', lang: 'Shell', cats: ['ethical-hacking'], topics: ['ctf', 'hacking'], stars: 12, forks: 1, createdHoursAgo: 600, pushedHoursAgo: 400, license: null },
  { name: 'jailbreak-benchmark', desc: 'Fictional benchmark of LLM jailbreak resistance.', lang: 'Python', cats: ['ai-security'], topics: ['llm-jailbreak', 'ai-red-teaming'], stars: 1340, forks: 150, createdHoursAgo: 700, pushedHoursAgo: 15 },
  { name: 'pcap-timeline', desc: 'Fictional network capture timeline builder for incident response.', lang: 'Rust', cats: ['digital-forensics', 'blue-team'], topics: ['incident-response', 'forensics'], stars: 97, forks: 9, createdHoursAgo: 900, pushedHoursAgo: 70 },
  { name: 'firmware-unpacker-x', desc: 'Fictional firmware extraction and analysis helper.', lang: 'C', cats: ['reverse-engineering'], topics: ['firmware-analysis', 'binary-analysis'], stars: 260, forks: 25, createdHoursAgo: 1100, pushedHoursAgo: 140 },
  { name: 'phish-sim-trainer', desc: 'Fictional phishing simulation platform for awareness training.', lang: 'PHP', cats: ['red-team'], topics: ['phishing', 'red-team'], stars: 330, forks: 40, createdHoursAgo: 1500, pushedHoursAgo: 30 },
  { name: 'yara-forge-mini', desc: 'Fictional YARA rule builder with tests.', lang: 'Python', cats: ['malware-analysis', 'threat-intelligence'], topics: ['yara', 'malware-detection'], stars: 610, forks: 44, createdHoursAgo: 1800, pushedHoursAgo: 48 },
  { name: 'secure-headers-check', desc: 'Fictional HTTP security headers scanner.', lang: 'JavaScript', cats: ['web-security'], topics: ['web-security', 'owasp'], stars: 150, forks: 12, createdHoursAgo: 2000, pushedHoursAgo: 150 },
  { name: 'soc-dashboard-kit', desc: 'Fictional SOC dashboard starter for open source SIEMs.', lang: 'TypeScript', cats: ['blue-team'], topics: ['soc', 'siem', 'wazuh'], stars: 2100, forks: 230, createdHoursAgo: 5000, pushedHoursAgo: 26 },
  { name: 'old-but-active-scanner', desc: 'Fictional older scanner that is still actively maintained (appears only in "Recently updated").', lang: 'Python', cats: ['cybersecurity', 'pentesting'], topics: ['security-tools', 'vulnerability-scanner'], stars: 5400, forks: 800, createdHoursAgo: 20000, pushedHoursAgo: 3 },
];

const iso = (hoursAgo: number) => new Date(GENERATED_AT.getTime() - hoursAgo * H).toISOString();

const repos: Repo[] = seeds.map((s, i) => ({
  id: 900_000_000 + i,
  fullName: `demo-ficticio/ficticio-${s.name}`,
  owner: 'demo-ficticio',
  name: `ficticio-${s.name}`,
  url: `https://demo-ficticio.invalid/ficticio-${s.name}`,
  description: `[DEMO] ${s.desc}`,
  language: s.lang,
  stars: s.stars,
  forks: s.forks,
  openIssues: Math.round(s.forks / 3),
  topics: [...s.topics].sort(),
  license: s.license === undefined ? (i % 3 === 0 ? 'Apache-2.0' : 'MIT') : s.license,
  createdAt: iso(s.createdHoursAgo),
  pushedAt: iso(s.pushedHoursAgo),
  updatedAt: iso(Math.min(s.pushedHoursAgo, s.createdHoursAgo)),
  firstSeen: iso(Math.min(s.createdHoursAgo, 2000)),
  lastSeen: GENERATED_AT.toISOString(),
  categories: s.cats,
  flags: s.poc ? ['poc'] : [],
}));

const dataset: Dataset = {
  meta: {
    schemaVersion: 1,
    generatedAt: GENERATED_AT.toISOString(),
    demo: true,
    queriesTotal: 0,
    queriesFailed: 0,
    itemsFetched: 0,
    repoCount: repos.length,
    partial: false,
    notes: ['FICTIONAL DEMO DATASET — these repositories do not exist.'],
  },
  repos,
};

await writeFile('public/data/demo.json', `${JSON.stringify(dataset, null, 1)}\n`);
console.log(`Wrote ${repos.length} fictional repos to public/data/demo.json`);
