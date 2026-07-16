#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const main = async () => {
  const vite = await createServer({
    root,
    mode: 'production',
    appType: 'custom',
    logLevel: 'warn',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true }
  });

  try {
    const { PUBLIC_APP_URL, publicSeoRoutes } = await vite.ssrLoadModule('/utils/seoMeta.ts');
    const entries = publicSeoRoutes.map((meta) => {
      const fields = [
        `    <loc>${escapeXml(`${PUBLIC_APP_URL}${meta.path}`)}</loc>`,
        meta.lastModified ? `    <lastmod>${escapeXml(meta.lastModified)}</lastmod>` : '',
        meta.changeFrequency ? `    <changefreq>${escapeXml(meta.changeFrequency)}</changefreq>` : '',
        typeof meta.priority === 'number' ? `    <priority>${meta.priority.toFixed(1)}</priority>` : ''
      ].filter(Boolean);
      return `  <url>\n${fields.join('\n')}\n  </url>`;
    });

    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      '</urlset>',
      ''
    ].join('\n');

    fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap, 'utf8');
    console.log(`Generated sitemap.xml with ${publicSeoRoutes.length} public routes.`);
  } finally {
    await vite.close();
  }
};

main().catch((error) => {
  console.error('Sitemap generation failed:', error);
  process.exitCode = 1;
});
