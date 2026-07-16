#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const templatePath = path.join(dist, 'index.html');

const writeRoute = (html, routePath) => {
  if (routePath === '/') {
    fs.writeFileSync(templatePath, html, 'utf8');
    return;
  }

  const relativePath = routePath.replace(/^\//, '');
  const directoryPath = path.join(dist, relativePath, 'index.html');
  const cleanUrlPath = path.join(dist, `${relativePath}.html`);
  fs.mkdirSync(path.dirname(directoryPath), { recursive: true });
  fs.mkdirSync(path.dirname(cleanUrlPath), { recursive: true });
  fs.writeFileSync(directoryPath, html, 'utf8');
  fs.writeFileSync(cleanUrlPath, html, 'utf8');
};

const main = async () => {
  if (!fs.existsSync(templatePath)) {
    throw new Error('dist/index.html was not found. Run vite build before prerendering.');
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const vite = await createServer({
    root,
    mode: 'production',
    appType: 'custom',
    logLevel: 'warn',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true }
  });

  try {
    const { prerenderRoutes } = await vite.ssrLoadModule('/prerender/routes.tsx');
    const { createNoindexShell, injectIntoTemplate, renderRoute } =
      await vite.ssrLoadModule('/prerender/render.tsx');
    const { publicSeoPaths } = await vite.ssrLoadModule('/utils/seoMeta.ts');

    const manifestPaths = prerenderRoutes.map((route) => route.path);
    const missingFromManifest = publicSeoPaths.filter((routePath) => !manifestPaths.includes(routePath));
    const missingFromSeoRegistry = manifestPaths.filter((routePath) => !publicSeoPaths.includes(routePath));
    if (new Set(manifestPaths).size !== manifestPaths.length) {
      throw new Error('The prerender route manifest contains duplicate paths.');
    }
    if (missingFromManifest.length || missingFromSeoRegistry.length) {
      throw new Error(
        `SEO registry and prerender manifest differ. Missing from manifest: ${missingFromManifest.join(', ') || 'none'}. Missing from SEO registry: ${missingFromSeoRegistry.join(', ') || 'none'}.`
      );
    }

    for (const route of prerenderRoutes) {
      const bodyHtml = renderRoute(route);
      if (!bodyHtml.trim()) throw new Error(`Prerender produced no content for ${route.path}`);
      writeRoute(injectIntoTemplate(template, { path: route.path, bodyHtml }), route.path);
    }

    fs.writeFileSync(path.join(dist, 'noindex.html'), createNoindexShell(template), 'utf8');
    console.log(`Prerendered ${prerenderRoutes.length} public routes with visible HTML.`);
  } finally {
    await vite.close();
  }
};

main().catch((error) => {
  console.error('SEO prerender failed:', error);
  process.exitCode = 1;
});
