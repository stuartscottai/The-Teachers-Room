import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';
import { getPublicAppUrl } from '../utils/appUrl';

type RouteMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

const DEFAULT_META: RouteMeta = {
  title: "The Teachers' Room | AI Games and Worksheets for Teachers",
  description:
    'Create classroom games, worksheets, quizzes, and printable teaching resources with AI-powered tools built for busy teachers.',
  path: '/'
};

const routeMeta: Record<string, RouteMeta> = {
  '/': DEFAULT_META,
  '/games': {
    title: "Classroom Game Maker | The Teachers' Room",
    description:
      'Create AI-powered classroom games including trivia, Jeopardy-style quizzes, word wheels, pub quizzes, darts, and more.',
    path: '/games'
  },
  '/worksheets': {
    title: "AI Worksheet Generator | The Teachers' Room",
    description:
      'Build printable worksheets, word searches, matching activities, gap fills, and custom classroom resources from topics or uploaded files.',
    path: '/worksheets'
  },
  '/pricing': {
    title: "Pricing | The Teachers' Room",
    description:
      "Compare free, teacher, and school plans for The Teachers' Room classroom resource and game creation tools.",
    path: '/pricing'
  },
  '/info': {
    title: "Teacher Resource Help and FAQs | The Teachers' Room",
    description:
      "Learn how to use The Teachers' Room to create classroom games, worksheets, prompts, and teaching resources faster.",
    path: '/info'
  },
  '/blog': {
    title: "Teacher Blog | The Teachers' Room",
    description:
      'Practical articles on AI in education, classroom games, ESL teaching, worksheets, and teacher workflow ideas.',
    path: '/blog'
  },
  '/contact': {
    title: "Contact | The Teachers' Room",
    description:
      "Contact The Teachers' Room with questions, support requests, school plan enquiries, or feedback.",
    path: '/contact'
  },
  '/terms': {
    title: "Terms of Service | The Teachers' Room",
    description: "Read the terms of service for using The Teachers' Room.",
    path: '/terms'
  },
  '/privacy': {
    title: "Privacy Policy | The Teachers' Room",
    description: "Read how The Teachers' Room handles account, content, and usage data.",
    path: '/privacy'
  }
};

const noindexPrefixes = [
  '/profile',
  '/reset-password',
  '/choose-plan',
  '/change-plan',
  '/school-admin',
  '/test',
  '/share/game',
  '/student/game'
];

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

const resolveMeta = (pathname: string): RouteMeta => {
  const blogMatch = pathname.match(/^\/blog\/(\d+)$/);
  if (blogMatch) {
    const post = blogPosts.find((entry) => entry.id === Number(blogMatch[1]));
    if (post) {
      return {
        title: `${post.title} | The Teachers' Room`,
        description: post.subtitle,
        path: `/blog/${post.id}`
      };
    }
  }

  const exact = routeMeta[pathname];
  if (exact) return exact;

  return {
    ...DEFAULT_META,
    noindex: noindexPrefixes.some((prefix) => pathname.startsWith(prefix))
  };
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
