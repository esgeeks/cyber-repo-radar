import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Adds a strict Content-Security-Policy to the production HTML.
 * Only same-origin scripts, styles, fonts, images and data are allowed.
 * When AdSense is enabled the policy is not added (AdSense loads code from many Google domains);
 * see README → "Publicidad (AdSense)".
 */
function csp(enabled: boolean): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || 'https://radar.esgeeks.com').replace(/\/+$/, '');
  process.env.VITE_SITE_URL = siteUrl;
  const adsense = Boolean(process.env.VITE_ADSENSE_CLIENT || env.VITE_ADSENSE_CLIENT);

  return {
    // Relative base: the same build works at a domain root (radar.esgeeks.com) or in a sub-path
    // (esgeeks.github.io/cyber-repo-radar/ or esgeeks.com/radar/) thanks to hash routing.
    base: './',
    plugins: [react(), tailwindcss(), csp(!adsense)],
    build: {
      target: 'es2022',
      sourcemap: false,
      // Never inline assets as data: URIs, so the strict CSP (font-src 'self') holds.
      assetsInlineLimit: 0,
    },
  };
});
