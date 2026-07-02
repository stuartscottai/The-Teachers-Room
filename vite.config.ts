
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { PUBLIC_APP_URL, publicSeoPaths, resolveMeta } from './utils/seoMeta';

const hmrHost = process.env.VITE_HMR_HOST;
const outDir = 'dist';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const upsertHeadTag = (html: string, pattern: RegExp, tag: string) => {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
};

const buildSeoHtml = (html: string, routePath: string) => {
  const meta = resolveMeta(routePath);
  const canonicalUrl = `${PUBLIC_APP_URL}${meta.path}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const robots = meta.noindex ? 'noindex,nofollow' : 'index,follow';

  let nextHtml = html
    .replace(/<title[^>]*>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${robots}" />`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );

  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`
  );

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: "The Teachers' Room",
      url: PUBLIC_APP_URL,
      logo: `${PUBLIC_APP_URL}/icon-192.png`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: "The Teachers' Room",
      url: PUBLIC_APP_URL
    }
  ];

  const script = `<script type="application/ld+json" id="jsonld-static-seo">${JSON.stringify(jsonLd)}</script>`;
  nextHtml = nextHtml.replace(/\s*<script type="application\/ld\+json" id="jsonld-static-seo">.*?<\/script>/s, '');
  return nextHtml.replace('</head>', `    ${script}\n  </head>`);
};

const staticSeoPagesPlugin = () => ({
  name: 'static-seo-pages',
  closeBundle() {
    const indexPath = path.resolve(outDir, 'index.html');
    const baseHtml = fs.readFileSync(indexPath, 'utf8');

    for (const routePath of publicSeoPaths) {
      const seoHtml = buildSeoHtml(baseHtml, routePath);
      if (routePath === '/') {
        fs.writeFileSync(indexPath, seoHtml);
        continue;
      }

      const routeDir = path.resolve(outDir, routePath.replace(/^\//, ''));
      fs.mkdirSync(routeDir, { recursive: true });
      fs.writeFileSync(path.join(routeDir, 'index.html'), seoHtml);

      const routeHtmlPath = path.resolve(outDir, `${routePath.replace(/^\//, '')}.html`);
      fs.mkdirSync(path.dirname(routeHtmlPath), { recursive: true });
      fs.writeFileSync(routeHtmlPath, seoHtml);
    }
  }
});

export default defineConfig({
  plugins: [react(), staticSeoPagesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve('.'),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    host: true,
    allowedHosts: ['local.theteachersroom.test'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=()',
    },
    ...(hmrHost ? { hmr: { host: hmrHost, protocol: 'ws' } } : {}),
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), geolocation=()',
    },
  },
  build: {
    outDir,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
