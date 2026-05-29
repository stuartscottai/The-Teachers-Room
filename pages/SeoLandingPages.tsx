import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Gamepad2, GraduationCap, Radio, Sparkles } from 'lucide-react';

type LandingPageConfig = {
  badge: string;
  title: string;
  intro: string;
  bullets: string[];
  examples: string[];
  cta: string;
  icon: React.ReactNode;
};

const pages: Record<string, LandingPageConfig> = {
  createClassroomGames: {
    badge: 'Classroom game creator',
    title: 'Create Classroom Games with AI',
    intro:
      'Turn a lesson topic into a classroom game in minutes. Build trivia, live quizzes, Jeopardy-style games, word games, board games, and review activities for your students.',
    bullets: [
      'Create games from a topic, objective, or uploaded source material.',
      'Choose from multiple classroom game formats for review, warmers, and end-of-lesson practice.',
      'Edit questions, answers, images, and game settings before using them with your class.'
    ],
    examples: ['Vocabulary review', 'History recap', 'Science quiz', 'Exam practice'],
    cta: 'Create a classroom game',
    icon: <Gamepad2 size={30} />
  },
  classroomQuizMaker: {
    badge: 'Quiz maker for teachers',
    title: 'Classroom Quiz Maker for Teachers',
    intro:
      'Create quiz games for lessons, revision, and quick checks for understanding. Make trivia quizzes, live quizzes, and team review games from almost any classroom topic.',
    bullets: [
      'Generate multiple-choice, open, or mixed question sets.',
      'Use quiz formats such as Trivia, Pub Quiz, Millionaire Maker, and Live Quiz Challenge.',
      'Save, edit, play, and share quiz games with students.'
    ],
    examples: ['Trivia quiz', 'Pub quiz', 'Live quiz', 'Team quiz'],
    cta: 'Make a classroom quiz',
    icon: <Sparkles size={30} />
  },
  liveQuizForTeachers: {
    badge: 'Live classroom quiz',
    title: 'Run Live Classroom Quizzes',
    intro:
      'Host a real-time quiz on the classroom screen while students join from their own devices with a code or QR link.',
    bullets: [
      'Use live quizzes for quick review, retrieval practice, and whole-class competition.',
      'Students can join without needing teacher accounts.',
      'Show answer reveals and finish with a live leaderboard.'
    ],
    examples: ['Starter quiz', 'End-of-class review', 'Revision race', 'Team challenge'],
    cta: 'Start a live quiz',
    icon: <Radio size={30} />
  },
  eslClassroomGames: {
    badge: 'ESL classroom games',
    title: 'Create ESL Classroom Games with AI',
    intro:
      'Build vocabulary, grammar, speaking, and review games for English language learners. Create fast classroom activities matched to your topic, level, and lesson goal.',
    bullets: [
      'Create games for vocabulary, grammar, speaking prompts, and topic review.',
      'Adapt activities for different levels, ages, and class lengths.',
      'Use formats such as Word Wheel, Stop the Fire, Trivia, and Live Quiz Challenge.'
    ],
    examples: ['Vocabulary race', 'Grammar review', 'Speaking prompts', 'Topic recap'],
    cta: 'Create an ESL game',
    icon: <GraduationCap size={30} />
  }
};

const LandingPage: React.FC<{ config: LandingPageConfig }> = ({ config }) => (
  <div className="bg-slate-50 min-h-screen">
    <section className="bg-brand-blue text-white">
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm font-bold text-sky-50 mb-6">
            <span className="text-brand-yellow">{config.icon}</span>
            {config.badge}
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-black leading-tight mb-6">{config.title}</h1>
          <p className="text-lg md:text-xl text-sky-50 leading-relaxed max-w-2xl">{config.intro}</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/games"
              className="inline-flex items-center justify-center rounded-full bg-brand-yellow px-7 py-4 font-bold text-slate-900 shadow-lg hover:bg-yellow-300 transition-colors"
            >
              {config.cta}
              <ArrowRight size={18} className="ml-2" />
            </Link>
            <Link
              to="/info"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-4 font-bold text-white hover:bg-white/10 transition-colors"
            >
              Learn how it works
            </Link>
          </div>
        </div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
          <h2 className="font-display text-3xl font-bold text-slate-800 mb-6">Built for real classroom use</h2>
          <div className="space-y-5">
            {config.bullets.map((bullet) => (
              <div key={bullet} className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                <p className="text-slate-600 leading-relaxed">{bullet}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-5">Good for</h2>
          <div className="grid grid-cols-2 gap-3">
            {config.examples.map((example) => (
              <div key={example} className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm font-bold text-sky-900">
                {example}
              </div>
            ))}
          </div>
          <Link
            to="/games"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand-blue px-5 py-4 font-bold text-white hover:bg-sky-600 transition-colors"
          >
            Open Game Hub
            <ArrowRight size={18} className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export const CreateClassroomGamesPage: React.FC = () => <LandingPage config={pages.createClassroomGames} />;
export const ClassroomQuizMakerPage: React.FC = () => <LandingPage config={pages.classroomQuizMaker} />;
export const LiveQuizForTeachersPage: React.FC = () => <LandingPage config={pages.liveQuizForTeachers} />;
export const EslClassroomGamesPage: React.FC = () => <LandingPage config={pages.eslClassroomGames} />;
