import React from 'react';
import { Home } from '../pages/Home';
import { Games } from '../pages/Games';
import { Blog } from '../pages/Blog';
import { BlogPostPage } from '../pages/BlogPost';
import { Contact, Info, Legal, Pricing } from '../pages/InfoPages';
import {
  ClassroomQuizMakerPage,
  CreateClassroomGamesPage,
  EslClassroomGamesPage,
  LiveQuizForTeachersPage
} from '../pages/SeoLandingPages';
import { publicBlogPosts } from '../data/blogPosts';

export type PrerenderRoute = {
  path: string;
  routePattern?: string;
  Component: React.ComponentType<any>;
  props?: Record<string, unknown>;
};

export const prerenderRoutes: PrerenderRoute[] = [
  { path: '/', Component: Home },
  { path: '/games', Component: Games },
  { path: '/create-classroom-games', Component: CreateClassroomGamesPage },
  { path: '/classroom-quiz-maker', Component: ClassroomQuizMakerPage },
  { path: '/live-quiz-for-teachers', Component: LiveQuizForTeachersPage },
  { path: '/esl-classroom-games', Component: EslClassroomGamesPage },
  { path: '/pricing', Component: Pricing },
  { path: '/info', Component: Info },
  { path: '/blog', Component: Blog },
  ...publicBlogPosts.map((post) => ({
    path: `/blog/${post.id}`,
    routePattern: '/blog/:id',
    Component: BlogPostPage
  })),
  { path: '/contact', Component: Contact },
  { path: '/terms', Component: Legal, props: { type: 'terms' } },
  { path: '/privacy', Component: Legal, props: { type: 'privacy' } }
];
