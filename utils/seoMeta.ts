import { publicBlogPosts } from '../data/blogPosts';
import { classBooklets } from '../data/classBooklets';

export type SitemapChangeFrequency = 'weekly' | 'monthly' | 'yearly';
export type StructuredDataKind = 'home' | 'webpage' | 'blog' | 'article';

export type RouteMeta = {
  title: string;
  description: string;
  path: string;
  image: string;
  structuredData: StructuredDataKind;
  noindex?: boolean;
  includeInSitemap?: boolean;
  lastModified?: string;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
  publishedTime?: string;
};

export const PUBLIC_APP_URL = 'https://www.theteachersroom.app';
export const DEFAULT_SOCIAL_IMAGE = '/assets/games/trivia.png';

export const DEFAULT_META: RouteMeta = {
  title: "AI Classroom Games for Teachers | The Teachers' Room",
  description:
    'Create classroom games, quizzes, and review activities with AI. Build trivia, live quizzes, Jeopardy-style games, word games, and more for your students.',
  path: '/',
  image: DEFAULT_SOCIAL_IMAGE,
  structuredData: 'home',
  includeInSitemap: true,
  lastModified: '2026-07-16',
  changeFrequency: 'weekly',
  priority: 1
};

export const routeMeta: Record<string, RouteMeta> = {
  '/': DEFAULT_META,
  '/games': {
    title: 'AI Classroom Game Maker | Create Quiz Games for Teachers',
    description:
      'Use an AI classroom game maker to create quiz games, live quizzes, Jeopardy-style games, word games, board games, and review activities for teachers.',
    path: '/games',
    image: '/assets/games/jeopardy.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'weekly',
    priority: 0.9
  },
  '/create-classroom-games': {
    title: "Create Classroom Games Online with AI | The Teachers' Room",
    description:
      'Create classroom games, quizzes, and review activities with AI. Turn any lesson topic into trivia, live quizzes, Jeopardy-style games, word games, and more.',
    path: '/create-classroom-games',
    image: '/assets/games/pubquiz.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/survey-showdown': {
    title: "Survey Showdown Classroom Game for Teachers | The Teachers' Room",
    description: 'Get your class guessing with Survey Showdown. Teams reveal hidden answers, collect points and share ideas. Create an answer board for whatever you teach.',
    path: '/game-types/survey-showdown',
    image: '/assets/game-types/survey-showdown/hero-exploded.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/stop-the-fire': {
    title: "Stop the Fire Classroom Game for Teachers | The Teachers' Room",
    description: 'Race to find answers with Stop the Fire. One letter, your chosen categories and a ticking timer bring quick thinking and friendly competition to any lesson.',
    path: '/game-types/stop-the-fire',
    image: '/assets/game-types/stop-the-fire/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-28',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/millionaire-maker': {
    title: "Millionaire Maker Classroom Game for Teachers | The Teachers' Room",
    description: 'Climb the prize ladder with Millionaire Maker. Explore multiple-choice questions, lifelines and classroom ideas, then create a quiz for whatever you teach.',
    path: '/game-types/millionaire-maker',
    image: '/assets/game-types/millionaire-maker/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-28',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/darts-challenge': {
    title: "Darts Challenge Classroom Game for Teachers | The Teachers' Room",
    description: 'Aim for the points with Darts Challenge. Choose a target, answer a question and see your team score grow. Create a classroom darts quiz for any subject.',
    path: '/game-types/darts-challenge',
    image: '/assets/game-types/darts-challenge/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-28',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/snakes-and-ladders': {
    title: "Snakes and Ladders Classroom Game for Teachers | The Teachers' Room",
    description: 'Bring lesson questions onto a Snakes and Ladders board. Roll, answer and move with your class, then create a game for revision, practice or a friendly challenge.',
    path: '/game-types/snakes-and-ladders',
    image: '/assets/game-types/snakes-and-ladders/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-28',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/pub-quiz': {
    title: "Pub Quiz Classroom Game for Teachers | The Teachers' Room",
    description: 'Bring your class together for a team Pub Quiz. Explore themed rounds, shared questions and simple scoring, then create a quiz for whatever you teach.',
    path: '/game-types/pub-quiz',
    image: '/assets/game-types/pub-quiz/hero-rounds-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/live-quiz': {
    title: "Live Quiz Classroom Game for Teachers | The Teachers' Room",
    description: 'Bring everyone into the lesson with Live Quiz. Students answer on their own devices while you lead the questions, share the answers and follow the standings.',
    path: '/game-types/live-quiz',
    image: '/assets/game-types/live-quiz/hero-exploded.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/blockbeaters': {
    title: "Blockbeaters Classroom Game for Teachers | The Teachers' Room",
    description: 'Answer questions, claim hexagons and plan your path across the board. Explore Blockbeaters and create a team challenge for any subject you teach.',
    path: '/game-types/blockbeaters',
    image: '/assets/game-types/blockbeaters/ChatGPT Image Sep 27, 2026, 10_12_53 PM.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/wordwheel': {
    title: "Wordwheel Classroom Game for Teachers | The Teachers' Room",
    description: 'Take your students around the alphabet with Wordwheel. Solve letter clues together and create a friendly team challenge for any subject you teach.',
    path: '/game-types/wordwheel',
    image: '/assets/game-types/wordwheel/hero-vivid.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/time-bomb': {
    title: "Time Bomb Classroom Game for Teachers | The Teachers' Room",
    description: 'Get your students thinking on their feet with Time Bomb. Answer questions, pass the bomb and enjoy a lively team game for any subject you teach.',
    path: '/game-types/time-bomb',
    image: '/assets/game-types/time-bomb/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/jeopardy': {
    title: "Classroom Jeopardy Game for Teachers | The Teachers' Room",
    description: 'Let your students choose a category, pick a challenge and work together. Explore classroom Jeopardy and create a game for any subject you teach.',
    path: '/game-types/jeopardy',
    image: '/assets/game-types/jeopardy/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/game-types/trivia': {
    title: "Classroom Trivia Game for Teachers | The Teachers' Room",
    description: 'Bring a little friendly competition to your lessons with Trivia. See how it works and create a team quiz for maths, science, history or any subject you teach.',
    path: '/game-types/trivia',
    image: '/assets/game-types/trivia/hero-transparent.webp',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-09-27',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/classroom-quiz-maker': {
    title: "Classroom Quiz Maker for Teachers | The Teachers' Room",
    description:
      'Create classroom quiz games for lessons, revision, and quick checks for understanding. Make trivia, live quizzes, and team review games from any topic.',
    path: '/classroom-quiz-maker',
    image: '/assets/game-types/trivia/question.jpg',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/live-quiz-for-teachers': {
    title: "Live Quiz Maker for Teachers | The Teachers' Room",
    description:
      'Run live classroom quizzes with student join codes, answer reveals, speed scoring, and a leaderboard.',
    path: '/live-quiz-for-teachers',
    image: '/assets/games/livequiz.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/esl-classroom-games': {
    title: "ESL Classroom Games with AI | The Teachers' Room",
    description:
      'Create ESL classroom games for vocabulary, grammar, speaking practice, and lesson review with AI-powered game tools for teachers.',
    path: '/esl-classroom-games',
    image: '/assets/games/wordwheel.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.8
  },
  '/pricing': {
    title: "Pricing | The Teachers' Room",
    description:
      "Compare free, teacher, and school plans for The Teachers' Room classroom resource and game creation tools.",
    path: '/pricing',
    image: '/assets/games/millionaire.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.7
  },
  '/info': {
    title: "Teacher Resource Help and FAQs | The Teachers' Room",
    description:
      "Learn how to use The Teachers' Room to create classroom games, prompts, and teaching resources faster.",
    path: '/info',
    image: '/assets/games/snakes.png',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.7
  },
  '/blog': {
    title: "Teacher Blog | The Teachers' Room",
    description:
      'Practical articles on AI in education, classroom games, ESL teaching, and teacher workflow ideas.',
    path: '/blog',
    image: '/assets/blog-aireportwriter-og.png',
    structuredData: 'blog',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'weekly',
    priority: 0.7
  },
  '/contact': {
    title: "Contact | The Teachers' Room",
    description:
      "Contact The Teachers' Room with questions, support requests, school plan enquiries, or feedback.",
    path: '/contact',
    image: '/assets/game-types/live-quiz/question.jpg',
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'monthly',
    priority: 0.5
  },
  '/terms': {
    title: "Terms of Service | The Teachers' Room",
    description: "Read the terms of service for using The Teachers' Room.",
    path: '/terms',
    image: DEFAULT_SOCIAL_IMAGE,
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'yearly',
    priority: 0.3
  },
  '/privacy': {
    title: "Privacy Policy | The Teachers' Room",
    description: "Read how The Teachers' Room handles account, content, and usage data.",
    path: '/privacy',
    image: DEFAULT_SOCIAL_IMAGE,
    structuredData: 'webpage',
    includeInSitemap: true,
    lastModified: '2026-07-16',
    changeFrequency: 'yearly',
    priority: 0.3
  }
};

const blogPublicationDates: Record<number, string> = {
  1: '2024-10-12',
  2: '2024-10-28',
  3: '2024-11-05',
  5: '2024-12-01',
  6: '2026-04-06'
};

export const blogRouteMeta: RouteMeta[] = publicBlogPosts.map((post) => ({
  title: `${post.title} | The Teachers' Room`,
  description: post.subtitle,
  path: `/blog/${post.id}`,
  image: post.id === 6 ? '/assets/blog-aireportwriter-og.png' : post.image,
  structuredData: 'article',
  includeInSitemap: true,
  publishedTime: blogPublicationDates[post.id],
  lastModified: blogPublicationDates[post.id],
  changeFrequency: post.id === 6 ? 'monthly' : 'yearly',
  priority: post.id === 6 ? 0.6 : 0.5
}));

const blogMetaByPath = new Map(blogRouteMeta.map((meta) => [meta.path, meta]));

export const noindexPrefixes = [
  '/class',
  '/profile',
  '/reset-password',
  '/choose-plan',
  '/change-plan',
  '/school-admin',
  '/test',
  '/share/game',
  '/student/game',
  '/student/share',
  '/live'
];

const normalizePathname = (pathname: string) => {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/';
  if (withoutQuery === '/') return '/';
  return withoutQuery.replace(/\/+$/, '') || '/';
};

export const resolveMeta = (pathname: string): RouteMeta => {
  const normalizedPath = normalizePathname(pathname);
  const booklet = classBooklets.find(item => normalizedPath === `/class/${item.slug}`);
  if (booklet) return {
    title: `${booklet.level} Online Class Workbook | The Teachers' Room`,
    description: 'Temporary workbook for an online lesson.',
    path: normalizedPath, image: DEFAULT_SOCIAL_IMAGE, structuredData: 'webpage',
    noindex: true, includeInSitemap: false
  };
  const exact = routeMeta[normalizedPath] ?? blogMetaByPath.get(normalizedPath);
  if (exact) return exact;

  if (normalizedPath === '/student/game' || normalizedPath.startsWith('/student/game/')) {
    return {
      title: "Play Your Teacher's Game | The Teachers' Room",
      description: "Your teacher has shared a practice game with you. Open the link to play and test what you've learned.",
      path: normalizedPath,
      image: DEFAULT_SOCIAL_IMAGE,
      structuredData: 'webpage',
      noindex: true,
      includeInSitemap: false
    };
  }

  const isKnownPrivatePath = noindexPrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  return {
    title: isKnownPrivatePath
      ? "Private App Page | The Teachers' Room"
      : "Page Not Found | The Teachers' Room",
    description: isKnownPrivatePath
      ? "This functional page is not intended to appear in search results."
      : "The requested page could not be found.",
    path: normalizedPath,
    image: DEFAULT_SOCIAL_IMAGE,
    structuredData: 'webpage',
    noindex: true,
    includeInSitemap: false
  };
};

export const publicSeoRoutes: RouteMeta[] = [
  ...Object.values(routeMeta),
  ...blogRouteMeta
].filter((meta) => !meta.noindex && meta.includeInSitemap);

export const publicSeoPaths = publicSeoRoutes.map((meta) => meta.path);

export const toAbsoluteUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${PUBLIC_APP_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const getBreadcrumbName = (meta: RouteMeta) => {
  if (meta.structuredData === 'article') return meta.title.replace(/ \| The Teachers' Room$/, '');
  const firstTitlePart = meta.title.split('|', 1)[0]?.trim();
  return firstTitlePart || "The Teachers' Room";
};

export const buildStructuredData = (meta: RouteMeta): Record<string, unknown>[] => {
  const canonicalUrl = `${PUBLIC_APP_URL}${meta.path}`;
  const imageUrl = toAbsoluteUrl(meta.image);

  if (meta.structuredData === 'home') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${PUBLIC_APP_URL}/#organization`,
        name: "The Teachers' Room",
        url: PUBLIC_APP_URL,
        logo: `${PUBLIC_APP_URL}/icon-192.png`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${PUBLIC_APP_URL}/#website`,
        name: "The Teachers' Room",
        url: PUBLIC_APP_URL,
        publisher: { '@id': `${PUBLIC_APP_URL}/#organization` }
      }
    ];
  }

  const pageData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': meta.structuredData === 'blog' ? 'Blog' : 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: meta.title,
    description: meta.description,
    primaryImageOfPage: imageUrl,
    isPartOf: { '@id': `${PUBLIC_APP_URL}/#website` }
  };

  if (meta.structuredData === 'article') {
    pageData['@type'] = 'BlogPosting';
    pageData.headline = meta.title.replace(/ \| The Teachers' Room$/, '');
    pageData.image = imageUrl;
    pageData.datePublished = meta.publishedTime;
    pageData.dateModified = meta.lastModified ?? meta.publishedTime;
    pageData.author = { '@type': 'Organization', name: "The Teachers' Room" };
    pageData.publisher = { '@id': `${PUBLIC_APP_URL}/#organization` };
    pageData.mainEntityOfPage = canonicalUrl;
  }

  return [
    pageData,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${PUBLIC_APP_URL}/`
        },
        ...(meta.structuredData === 'article'
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Teacher Blog',
                item: `${PUBLIC_APP_URL}/blog`
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: getBreadcrumbName(meta),
                item: canonicalUrl
              }
            ]
          : [
              {
                '@type': 'ListItem',
                position: 2,
                name: getBreadcrumbName(meta),
                item: canonicalUrl
              }
            ])
      ]
    }
  ];
};
