import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { UnsavedChangesProvider } from '../contexts/UnsavedChangesContext';
import { Layout } from '../components/Layout';
import {
  buildStructuredData,
  PUBLIC_APP_URL,
  resolveMeta,
  RouteMeta,
  toAbsoluteUrl
} from '../utils/seoMeta';
import type { PrerenderRoute } from './routes';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const renderRoute = (route: PrerenderRoute) => {
  const previousConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (first.includes('useLayoutEffect does nothing on the server')) return;
    previousConsoleError(...args);
  };

  try {
    return renderToString(
      <AuthProvider>
        <UnsavedChangesProvider>
          <MemoryRouter initialEntries={[route.path]}>
            <Layout>
              <Routes>
                <Route
                  path={route.routePattern ?? route.path}
                  element={<route.Component {...(route.props ?? {})} />}
                />
              </Routes>
            </Layout>
          </MemoryRouter>
        </UnsavedChangesProvider>
      </AuthProvider>
    );
  } finally {
    console.error = previousConsoleError;
  }
};

const replaceOrInsert = (html: string, pattern: RegExp, tag: string) => {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
};

const buildHeadHtml = (meta: RouteMeta) => {
  const canonicalUrl = `${PUBLIC_APP_URL}${meta.path}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(toAbsoluteUrl(meta.image));
  const robots = meta.noindex ? 'noindex,nofollow' : 'index,follow';
  const socialType = meta.structuredData === 'article' ? 'article' : 'website';
  const jsonLd = JSON.stringify(buildStructuredData(meta)).replace(/</g, '\\u003c');

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:type" content="${socialType}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(meta.publishedTime
      ? [`<meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />`]
      : []),
    `<script type="application/ld+json" id="jsonld-route">${jsonLd}</script>`
  ].join('\n    ');
};

const HEAD_PATTERNS = [
  /<title[^>]*>[\s\S]*?<\/title>/i,
  /<meta\s+name="description"[^>]*>/i,
  /<meta\s+name="robots"[^>]*>/i,
  /<link\s+rel="canonical"[^>]*>/i,
  /<meta\s+property="og:(?:type|title|description|url|image)"[^>]*>/gi,
  /<meta\s+name="twitter:(?:title|description|image)"[^>]*>/gi,
  /<meta\s+property="article:published_time"[^>]*>/i,
  /<script\s+type="application\/ld\+json"\s+id="(?:jsonld-route|jsonld-static-seo|jsonld-organization|jsonld-website)"[^>]*>[\s\S]*?<\/script>/gi
];

export const injectIntoTemplate = (
  template: string,
  input: { path: string; bodyHtml?: string }
) => {
  const meta = resolveMeta(input.path);
  let html = template;
  for (const pattern of HEAD_PATTERNS) html = html.replace(pattern, '');
  html = html.replace('</head>', `    ${buildHeadHtml(meta)}\n  </head>`);
  html = html.replace(
    /<div id="root">[\s\S]*<\/div>(\s*<\/body>)/,
    `<div id="root">${input.bodyHtml ?? ''}</div>$1`
  );
  return html;
};

export const createNoindexShell = (template: string) =>
  injectIntoTemplate(template, { path: '/live', bodyHtml: '' });
