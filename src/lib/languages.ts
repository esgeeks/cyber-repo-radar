/** Colors for the most common languages (approximating GitHub's linguist palette). */
const COLORS: Record<string, string> = {
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  C: '#8d9bab',
  'C++': '#f34b7d',
  'C#': '#178600',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  PowerShell: '#5391FE',
  Ruby: '#e0457b',
  PHP: '#7a86b8',
  HTML: '#e34c26',
  CSS: '#663399',
  Nim: '#ffc200',
  Zig: '#ec915c',
  Lua: '#5a64e0',
  Swift: '#F05138',
  Dart: '#00B4AB',
  Assembly: '#9e8b6e',
  YARA: '#ff6f61',
  Jupyter: '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#4a8fd9',
  HCL: '#844FBA',
  Perl: '#5f8fb8',
  Batchfile: '#C1F12E',
  Vue: '#41b883',
  Svelte: '#ff3e00',
};

export function languageColor(language: string | null): string {
  return (language && COLORS[language]) || '#5d7487';
}
