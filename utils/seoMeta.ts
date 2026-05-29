import { publicBlogPosts } from '../data/blogPosts';

export type RouteMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

export const PUBLIC_APP_URL = 'https://www.theteachersroom.app';

export const DEFAULT_META: RouteMeta = {
  title: "Create Classroom Games with AI | The Teachers' Room",
  description:
    'Create classroom games, quizzes, and review activities with AI. Build trivia, live quizzes, Jeopardy-style games, word games, and more for your students.',
  path: '/'
};

export const routeMeta: Record<string, RouteMeta> = {
  '/': DEFAULT_META,
  '/games': {
    title: "AI Classroom Game Maker | Create Quiz Games for Teachers",
    description:
      'Use an AI classroom game maker to create quiz games, live quizzes, Jeopardy-style games, word games, board games, and review activities for teachers.',
    path: '/games'
  },
  '/create-classroom-games': {
    title: "Create Classroom Games with AI | The Teachers' Room",
    description:
      'Create classroom games, quizzes, and review activities with AI. Turn any lesson topic into trivia, live quizzes, Jeopardy-style games, word games, and more.',
    path: '/create-classroom-games'
  },
  '/classroom-quiz-maker': {
    title: "Classroom Quiz Maker for Teachers | The Teachers' Room",
    description:
      'Create classroom quiz games for lessons, revision, and quick checks for understanding. Make trivia, live quizzes, and team review games from any topic.',
    path: '/classroom-quiz-maker'
  },
  '/live-quiz-for-teachers': {
    title: "Live Quiz Maker for Teachers | The Teachers' Room",
    description:
      'Run live classroom quizzes with student join codes, answer reveals, speed scoring, and a leaderboard.',
    path: '/live-quiz-for-teachers'
  },
  '/esl-classroom-games': {
    title: "ESL Classroom Games with AI | The Teachers' Room",
    description:
      'Create ESL classroom games for vocabulary, grammar, speaking practice, and lesson review with AI-powered game tools for teachers.',
    path: '/esl-classroom-games'
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
      "Learn how to use The Teachers' Room to create classroom games, prompts, and teaching resources faster.",
    path: '/info'
  },
  '/blog': {
    title: "Teacher Blog | The Teachers' Room",
    description:
      'Practical articles on AI in education, classroom games, ESL teaching, and teacher workflow ideas.',
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

export const noindexPrefixes = [
  '/profile',
  '/reset-password',
  '/choose-plan',
  '/change-plan',
  '/school-admin',
  '/test',
  '/worksheets',
  '/share/game',
  '/student/game',
  '/student/share'
];

export const resolveMeta = (pathname: string): RouteMeta => {
  const blogMatch = pathname.match(/^\/blog\/(\d+)$/);
  if (blogMatch) {
    const post = publicBlogPosts.find((entry) => entry.id === Number(blogMatch[1]));
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

export const publicSeoPaths = [
  ...Object.keys(routeMeta),
  ...publicBlogPosts.map((post) => `/blog/${post.id}`)
];
