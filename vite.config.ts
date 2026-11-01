import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Adds a strict Content-Security-Policy to the production HTML.
 * Only same-origin scripts, styles, fonts, images and data are allowed.
 * When AdSense is enabled the policy is not added (AdSense loads code from many Google domains);
 * see README → "Publicidad (AdSense)".
 */
function csp(enabled: boolean, analytics: boolean): Plugin {
  const cfScript = analytics ? ' https://static.cloudflareinsights.com' : '';
  const cfConnect = analytics ? ' https://cloudflareinsights.com' : '';
  const policy = [
    "default-src 'self'",
    `script-src 'self'${cfScript}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${cfConnect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return {
    name: 'crr-csp',
    apply: 'build',
    transformIndexHtml(html) {
      if (!enabled) return html;
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

/**
 * Cloudflare Web Analytics (cookieless, no consent banner needed). Enabled only when
 * VITE_CF_ANALYTICS_TOKEN is set at build time (repository variable CF_ANALYTICS_TOKEN).
 */
function cloudflareAnalytics(token: string | undefined): Plugin {
  return {
    name: 'crr-cf-analytics',
    apply: 'build',
    transformIndexHtml(html) {
      if (!token) return html;
      if (!/^[a-f0-9]{32}$/i.test(token)) throw new Error('VITE_CF_ANALYTICS_TOKEN must be a 32-character hex token');
      const tag = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`;
      return html.replace('</body>', `    ${tag}\n  </body>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || 'https://radar.esgeeks.com').replace(/\/+$/, '');
  process.env.VITE_SITE_URL = siteUrl;
  const adsense = Boolean(process.env.VITE_ADSENSE_CLIENT || env.VITE_ADSENSE_CLIENT);
  const cfToken = (process.env.VITE_CF_ANALYTICS_TOKEN || env.VITE_CF_ANALYTICS_TOKEN || '').trim() || undefined;

  return {
    // Relative base: the same build works at a domain root (radar.esgeeks.com) or in a sub-path
    // (esgeeks.github.io/cyber-repo-radar/ or esgeeks.com/radar/) thanks to hash routing.
    base: './',
    plugins: [react(), tailwindcss(), csp(!adsense, Boolean(cfToken)), cloudflareAnalytics(cfToken)],
    build: {
      target: 'es2022',
      sourcemap: false,
      // Never inline assets as data: URIs, so the strict CSP (font-src 'self') holds.
      assetsInlineLimit: 0,
      // Two entry pages: English at "/" and Spanish at "/es/" (separate URLs for SEO + hreflang).
      rollupOptions: {
        input: { main: 'index.html', es: 'es/index.html' },
      },
    },
  };
});
