import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPublicAppUrl } from '../utils/appUrl';
import { buildStructuredData, resolveMeta } from '../utils/seoMeta';

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

const removeMeta = (selector: string) => {
  document.head.querySelector(selector)?.remove();
};

const upsertJsonLd = (id: string, data: Record<string, unknown>[]) => {
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
    const imageUrl = /^https?:\/\//i.test(meta.image)
      ? meta.image
      : `${getPublicAppUrl()}${meta.image}`;
    const socialType = meta.structuredData === 'article' ? 'article' : 'website';

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

    upsertMeta('meta[property="og:type"]', () => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:type');
      return element;
    }, socialType);

    upsertMeta('meta[property="og:image"]', () => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:image');
      return element;
    }, imageUrl);

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

    upsertMeta('meta[name="twitter:image"]', () => {
      const element = document.createElement('meta');
      element.name = 'twitter:image';
      return element;
    }, imageUrl);

    if (meta.publishedTime) {
      upsertMeta('meta[property="article:published_time"]', () => {
        const element = document.createElement('meta');
        element.setAttribute('property', 'article:published_time');
        return element;
      }, meta.publishedTime);
    } else {
      removeMeta('meta[property="article:published_time"]');
    }

    upsertLink('canonical', canonicalUrl);

    document.getElementById('jsonld-static-seo')?.remove();
    document.getElementById('jsonld-organization')?.remove();
    document.getElementById('jsonld-website')?.remove();
    upsertJsonLd('jsonld-route', buildStructuredData(meta));
  }, [location.pathname]);

  return null;
};
