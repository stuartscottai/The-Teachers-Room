import { StopTheFirePage } from '../pages/StopTheFirePage';
import { MillionaireMakerPage } from '../pages/MillionaireMakerPage';
import { DartsChallengePage } from '../pages/DartsChallengePage';
import { SnakesAndLaddersPage } from '../pages/SnakesAndLaddersPage';
import { SurveyShowdownPage } from '../pages/SurveyShowdownPage';
import { PubQuizPage } from '../pages/PubQuizPage';
import { LiveQuizPage } from '../pages/LiveQuizPage';
import React from 'react';
import { BlockBeatersPage } from '../pages/BlockBeatersPage';
import { WordWheelPage } from '../pages/WordWheelPage';
import { TimeBombPage } from '../pages/TimeBombPage';
import { JeopardyPage } from '../pages/JeopardyPage';
import { TriviaPage } from '../pages/TriviaPage';
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
  { path: '/game-types/survey-showdown', Component: SurveyShowdownPage },
  { path: '/game-types/stop-the-fire', Component: StopTheFirePage },
  { path: '/game-types/millionaire-maker', Component: MillionaireMakerPage },
  { path: '/game-types/darts-challenge', Component: DartsChallengePage },
  { path: '/game-types/snakes-and-ladders', Component: SnakesAndLaddersPage },
  { path: '/game-types/pub-quiz', Component: PubQuizPage },
  { path: '/game-types/live-quiz', Component: LiveQuizPage },
  { path: '/game-types/blockbeaters', Component: BlockBeatersPage },
  { path: '/game-types/wordwheel', Component: WordWheelPage },
  { path: '/game-types/time-bomb', Component: TimeBombPage },
  { path: '/game-types/jeopardy', Component: JeopardyPage },
  { path: '/game-types/trivia', Component: TriviaPage },
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
