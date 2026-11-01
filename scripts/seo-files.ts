/** Post-build: writes robots.txt and sitemap.xml into dist/ using the canonical site URL. */
import { readFile, writeFile } from 'node:fs/promises';

async function siteUrl(): Promise<string> {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;
  try {
    const env = await readFile('.env', 'utf8');
    const m = /^VITE_SITE_URL=(.+)$/m.exec(env);
    if (m?.[1]?.trim()) return m[1].trim();
  } catch {
    /* no .env */
  }
  return 'https://radar.esgeeks.com';
}

const url = (await siteUrl()).replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);

await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`);
const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${url}/"/>
    <xhtml:link rel="alternate" hreflang="es" href="${url}/es/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url}/"/>`;
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${url}/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority>${alternates}
  </url>
  <url>
    <loc>${url}/es/</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority>${alternates}
  </url>
</urlset>
`,
);
console.log(`robots.txt and sitemap.xml written for ${url}`);
