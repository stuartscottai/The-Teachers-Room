#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const sitemapPath = path.join(dist, 'sitemap.xml');
const llmsPath = path.join(dist, 'llms.txt');
const failures = [];

const fail = (message) => failures.push(message);
const capture = (html, pattern) => html.match(pattern)?.[1]?.trim() ?? '';
const stripMarkup = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

if (!fs.existsSync(sitemapPath)) {
  fail('dist/sitemap.xml is missing.');
}

const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
const urls = [...sitemap.matchAll(/<loc>https:\/\/www\.theteachersroom\.app([^<]*)<\/loc>/g)].map(
  (match) => match[1] || '/'
);

if (urls.length < 10) fail(`Sitemap contains only ${urls.length} public routes.`);
if (!urls.includes('/terms')) fail('Terms page is missing from the sitemap.');
if (!urls.includes('/privacy')) fail('Privacy page is missing from the sitemap.');

const privatePrefixes = [
  '/profile',
  '/reset-password',
  '/choose-plan',
  '/change-plan',
  '/school-admin',
  '/test',
  '/share',
  '/student',
  '/live'
];

if (!fs.existsSync(llmsPath)) {
  fail('dist/llms.txt is missing.');
} else {
  const llms = fs.readFileSync(llmsPath, 'utf8');
  const llmsUrls = [...llms.matchAll(/https:\/\/www\.theteachersroom\.app([^\s)\]]*)/g)].map(
    (match) => match[1] || '/'
  );

  if (!llms.startsWith("# The Teachers' Room")) {
    fail("llms.txt must begin with the product name as its main heading.");
  }
  if (!llms.includes('> The Teachers\' Room is a web app for teachers')) {
    fail('llms.txt is missing its short product summary.');
  }
  if (llmsUrls.length < 8) {
    fail(`llms.txt contains only ${llmsUrls.length} public links.`);
  }
  for (const llmsUrl of llmsUrls) {
    if (!urls.includes(llmsUrl)) {
      fail(`llms.txt links to ${llmsUrl}, which is not in the public sitemap.`);
    }
    if (privatePrefixes.some((prefix) => llmsUrl === prefix || llmsUrl.startsWith(`${prefix}/`))) {
      fail(`Private route ${llmsUrl} must not appear in llms.txt.`);
    }
  }
}

for (const url of urls) {
  if (privatePrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))) {
    fail(`Private route ${url} must not appear in the sitemap.`);
  }
}

const titles = new Map();
for (const routePath of urls) {
  const htmlPath =
    routePath === '/'
      ? path.join(dist, 'index.html')
      : path.join(dist, routePath.replace(/^\//, ''), 'index.html');

  if (!fs.existsSync(htmlPath)) {
    fail(`Generated HTML is missing for ${routePath}.`);
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const title = capture(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = capture(html, /<meta name="description" content="([^"]*)"/i);
  const robots = capture(html, /<meta name="robots" content="([^"]*)"/i);
  const canonical = capture(html, /<link rel="canonical" href="([^"]*)"/i);
  const image = capture(html, /<meta property="og:image" content="([^"]*)"/i);
  const rootHtml = capture(
    html,
    /<div id="root">([\s\S]*)<\/div>\s*<\/body>/i
  );
  const visibleWords = stripMarkup(rootHtml).split(/\s+/).filter(Boolean).length;
  const h1Count = (rootHtml.match(/<h1\b/gi) ?? []).length;

  if (!title) fail(`${routePath} has no title.`);
  if (!description) fail(`${routePath} has no description.`);
  if (robots !== 'index,follow') fail(`${routePath} is not marked index,follow.`);
  if (canonical !== `https://www.theteachersroom.app${routePath}`) {
    fail(`${routePath} has an incorrect canonical URL: ${canonical || '(missing)'}.`);
  }
  if (!image.startsWith('https://')) fail(`${routePath} has no absolute social image.`);
  if (!html.includes('id="jsonld-route"')) fail(`${routePath} has no structured data.`);
  if (visibleWords < 25) fail(`${routePath} contains only ${visibleWords} visible prerendered words.`);
  if (h1Count !== 1) fail(`${routePath} contains ${h1Count} main headings; exactly one is required.`);

  if (titles.has(title)) {
    fail(`${routePath} duplicates the title used by ${titles.get(title)}.`);
  } else {
    titles.set(title, routePath);
  }
}

const noindexPath = path.join(dist, 'noindex.html');
if (!fs.existsSync(noindexPath)) {
  fail('The private-route noindex shell is missing.');
} else {
  const noindexHtml = fs.readFileSync(noindexPath, 'utf8');
  if (!noindexHtml.includes('content="noindex,nofollow"')) {
    fail('The private-route shell does not contain noindex,nofollow.');
  }
  const privateRoot = capture(
    noindexHtml,
    /<div id="root">([\s\S]*)<\/div>\s*<\/body>/i
  );
  if (privateRoot) fail('The private-route shell should not contain public page content.');
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const fallback = vercelConfig.rewrites?.at(-1);
if (fallback?.destination !== '/noindex.html') {
  fail('The Vercel fallback must use /noindex.html so functional routes are not indexable.');
}

if (failures.length) {
  console.error(`SEO validation failed with ${failures.length} problem(s):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed for ${urls.length} public routes and the private-route fallback.`);
}
