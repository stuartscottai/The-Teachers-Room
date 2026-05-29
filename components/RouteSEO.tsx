import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPublicAppUrl } from '../utils/appUrl';
import { resolveMeta } from '../utils/seoMeta';

const upsertMeta = (selector: string, create: () => HTMLMetaElement, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  element.content = content;
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

const upsertJsonLd = (id: string, data: Record<string, unknown>) => {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
};

export const RouteSEO: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const meta = resolveMeta(location.pathname);
    const canonicalUrl = `${getPublicAppUrl()}${meta.path}`;
    const robots = meta.noindex ? 'noindex,nofollow' : 'index,follow';

    document.title = meta.title;

    upsertMeta('meta[name="description"]', () => {
      const element = document.createElement('meta');
      element.name = 'description';
      return element;
    }, meta.description);

    upsertMeta('meta[name="robots"]', () => {
      const element = document.createElement('meta');
      element.name = 'robots';
      return element;
    }, robots);

    upsertMeta('meta[property="og:title"]', () => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:title');
      return element;
    }, meta.title);

    upsertMeta('meta[property="og:description"]', () => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:description');
      return element;
    }, meta.description);

    upsertMeta('meta[property="og:url"]', () => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:url');
      return element;
    }, canonicalUrl);

    upsertMeta('meta[name="twitter:title"]', () => {
      const element = document.createElement('meta');
      element.name = 'twitter:title';
      return element;
    }, meta.title);

    upsertMeta('meta[name="twitter:description"]', () => {
      const element = document.createElement('meta');
      element.name = 'twitter:description';
      return element;
    }, meta.description);

    upsertLink('canonical', canonicalUrl);

    upsertJsonLd('jsonld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: "The Teachers' Room",
      url: getPublicAppUrl(),
      logo: `${getPublicAppUrl()}/favicon.svg`
    });

    upsertJsonLd('jsonld-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: "The Teachers' Room",
      url: getPublicAppUrl()
    });
  }, [location.pathname]);

  return null;
};
