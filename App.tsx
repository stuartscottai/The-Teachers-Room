import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from './utils/interfaceLanguage';

import React, { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';
import { RouteSEO } from './components/RouteSEO';
import { ErrorBoundary } from './components/ErrorBoundary';
import { classBooklets } from './data/classBooklets';

const ClassBooklet = lazy(() => import('./pages/ClassBooklet'));

const SurveyShowdownPage = lazy(() => import('./pages/SurveyShowdownPage').then(m => ({ default: m.SurveyShowdownPage })));
const StopTheFirePage = lazy(() => import('./pages/StopTheFirePage').then(m => ({ default: m.StopTheFirePage })));
const MillionaireMakerPage = lazy(() => import('./pages/MillionaireMakerPage').then(m => ({ default: m.MillionaireMakerPage })));
const DartsChallengePage = lazy(() => import('./pages/DartsChallengePage').then(m => ({ default: m.DartsChallengePage })));
const SnakesAndLaddersPage = lazy(() => import('./pages/SnakesAndLaddersPage').then(m => ({ default: m.SnakesAndLaddersPage })));
const PubQuizPage = lazy(() => import('./pages/PubQuizPage').then(m => ({ default: m.PubQuizPage })));
const LiveQuizPage = lazy(() => import('./pages/LiveQuizPage').then(m => ({ default: m.LiveQuizPage })));
const BlockBeatersPage = lazy(() => import('./pages/BlockBeatersPage').then(m => ({ default: m.BlockBeatersPage })));
const WordWheelPage = lazy(() => import('./pages/WordWheelPage').then(m => ({ default: m.WordWheelPage })));
const TimeBombPage = lazy(() => import('./pages/TimeBombPage').then(m => ({ default: m.TimeBombPage })));
const JeopardyPage = lazy(() => import('./pages/JeopardyPage').then(m => ({ default: m.JeopardyPage })));
const TriviaPage = lazy(() => import('./pages/TriviaPage').then(m => ({ default: m.TriviaPage })));
const Games = lazy(() => import('./pages/Games').then(({ Games }) => ({ default: Games })));
const GameCoverSmokeTest = lazy(() => import('./pages/GameCoverSmokeTest').then(({ GameCoverSmokeTest }) => ({ default: GameCoverSmokeTest })));
const Pricing = lazy(() => import('./pages/InfoPages').then(({ Pricing }) => ({ default: Pricing })));
const Info = lazy(() => import('./pages/InfoPages').then(({ Info }) => ({ default: Info })));
const Contact = lazy(() => import('./pages/InfoPages').then(({ Contact }) => ({ default: Contact })));
const Legal = lazy(() => import('./pages/InfoPages').then(({ Legal }) => ({ default: Legal })));
const Blog = lazy(() => import('./pages/Blog').then(({ Blog }) => ({ default: Blog })));
const BlogPostPage = lazy(() => import('./pages/BlogPost').then(({ BlogPostPage }) => ({ default: BlogPostPage })));
const CreateClassroomGamesPage = lazy(() => import('./pages/SeoLandingPages').then(({ CreateClassroomGamesPage }) => ({ default: CreateClassroomGamesPage })));
const ClassroomQuizMakerPage = lazy(() => import('./pages/SeoLandingPages').then(({ ClassroomQuizMakerPage }) => ({ default: ClassroomQuizMakerPage })));
const LiveQuizForTeachersPage = lazy(() => import('./pages/SeoLandingPages').then(({ LiveQuizForTeachersPage }) => ({ default: LiveQuizForTeachersPage })));
const EslClassroomGamesPage = lazy(() => import('./pages/SeoLandingPages').then(({ EslClassroomGamesPage }) => ({ default: EslClassroomGamesPage })));
const Profile = lazy(() => import('./pages/Profile').then(({ Profile }) => ({ default: Profile })));
const ChangePlan = lazy(() => import('./pages/ChangePlan').then(({ ChangePlan }) => ({ default: ChangePlan })));
const TestBench = lazy(() => import('./pages/TestBench').then(({ TestBench }) => ({ default: TestBench })));
const GameSmokeTest = lazy(() => import('./pages/GameSmokeTest').then(({ GameSmokeTest }) => ({ default: GameSmokeTest })));
const PreviewSmokeTest = lazy(() => import('./pages/PreviewSmokeTest').then(({ PreviewSmokeTest }) => ({ default: PreviewSmokeTest })));
const StudentPracticeSmokeTest = lazy(() =>
  import('./pages/StudentPracticeSmokeTest').then(({ StudentPracticeSmokeTest }) => ({ default: StudentPracticeSmokeTest }))
);
const LiveQuizSmokeTest = lazy(() =>
  import('./pages/LiveQuizSmokeTest').then(({ LiveQuizSmokeTest }) => ({ default: LiveQuizSmokeTest }))
);
const ShareGame = lazy(() => import('./pages/ShareGame').then(({ ShareGame }) => ({ default: ShareGame })));
const StudentGame = lazy(() => import('./pages/StudentGame').then(({ StudentGame }) => ({ default: StudentGame })));
const LiveQuizHost = lazy(() => import('./pages/LiveQuizHost').then(({ LiveQuizHost }) => ({ default: LiveQuizHost })));
const LiveQuizJoin = lazy(() => import('./pages/LiveQuizJoin').then(({ LiveQuizJoin }) => ({ default: LiveQuizJoin })));
const LiveQuizStudent = lazy(() => import('./pages/LiveQuizStudent').then(({ LiveQuizStudent }) => ({ default: LiveQuizStudent })));
const LiveQuizCodeEntry = lazy(() => import('./pages/LiveQuizCodeEntry').then(({ LiveQuizCodeEntry }) => ({ default: LiveQuizCodeEntry })));
const SchoolAdmin = lazy(() => import('./pages/SchoolAdmin').then(({ SchoolAdmin }) => ({ default: SchoolAdmin })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(({ ResetPassword }) => ({ default: ResetPassword })));

const AccountTierOnboardingRedirect: React.FC = () => {
  const { user, needsPlanSelection, isLoading, isPasswordRecovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== 'teachers-room-theme') return;
      const theme = event.newValue === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171a1f' : '#facc15');
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  useEffect(() => {
    if (isLoading || !user || !needsPlanSelection || isPasswordRecovery) return;
    if (location.pathname === '/reset-password') return;
    if (location.pathname === '/choose-plan') return;
    navigate('/choose-plan', { replace: true });
  }, [isLoading, isPasswordRecovery, location.pathname, navigate, needsPlanSelection, user]);

  return null;
};

const LegacyHashRouteRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const legacyPath = window.location.hash;
    if (!legacyPath.startsWith('#/')) return;

    const nextPath = legacyPath.slice(1) || '/';
    window.history.replaceState(null, '', nextPath);
    navigate(nextPath, { replace: true });
  }, [navigate]);

  return null;
};

const RouteLoading: React.FC<{ preserveEnglish?: boolean }> = ({ preserveEnglish }) => { useUiLanguage(); return ((
  <div className="min-h-[40vh] flex items-center justify-center px-6 text-center">
    <p className="text-sm font-semibold text-slate-500">{preserveEnglish ? 'Loading...' : ui("Loading...")}</p>
  </div>
)); };

const LazyRoute: React.FC<{ children: React.ReactNode; preserveEnglish?: boolean }> = ({ children, preserveEnglish }) => (
  <Suspense fallback={<RouteLoading preserveEnglish={preserveEnglish} />}>{children}</Suspense>
);

const GuardedRoute: React.FC<{ children: React.ReactNode; title?: string; message?: string }> = ({
  children,
  title = 'This game could not be loaded',
  message = 'Return to the previous page or retry. If this keeps happening, the error has been logged in the browser console.',
}) => {
  const navigate = useNavigate();
  return (
    <ErrorBoundary fallbackTitle={title} fallbackMessage={message} onBack={() => navigate('/games')}>
      {children}
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const setAppVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    };

    setAppVh();
    window.addEventListener('resize', setAppVh);
    window.addEventListener('orientationchange', setAppVh);
    return () => {
      window.removeEventListener('resize', setAppVh);
      window.removeEventListener('orientationchange', setAppVh);
    };
  }, []);

  return (
    <AuthProvider>
      <UnsavedChangesProvider>
          <LegacyHashRouteRedirect />
          <RouteSEO />
          <AccountTierOnboardingRedirect />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<GuardedRoute><LazyRoute><Games /></LazyRoute></GuardedRoute>} />
              <Route path="/game-types/survey-showdown" element={<LazyRoute><SurveyShowdownPage /></LazyRoute>} />
              <Route path="/game-types/stop-the-fire" element={<LazyRoute><StopTheFirePage /></LazyRoute>} />
              <Route path="/game-types/millionaire-maker" element={<LazyRoute><MillionaireMakerPage /></LazyRoute>} />
              <Route path="/game-types/darts-challenge" element={<LazyRoute><DartsChallengePage /></LazyRoute>} />
              <Route path="/game-types/snakes-and-ladders" element={<LazyRoute><SnakesAndLaddersPage /></LazyRoute>} />
              <Route path="/game-types/pub-quiz" element={<LazyRoute><PubQuizPage /></LazyRoute>} />
              <Route path="/game-types/live-quiz" element={<LazyRoute><LiveQuizPage /></LazyRoute>} />
              <Route path="/game-types/blockbeaters" element={<LazyRoute><BlockBeatersPage /></LazyRoute>} />
              <Route path="/game-types/wordwheel" element={<LazyRoute><WordWheelPage /></LazyRoute>} />
              <Route path="/game-types/time-bomb" element={<LazyRoute><TimeBombPage /></LazyRoute>} />
              <Route path="/game-types/jeopardy" element={<LazyRoute><JeopardyPage /></LazyRoute>} />
              <Route path="/game-types/trivia" element={<LazyRoute><TriviaPage /></LazyRoute>} />
              <Route path="/pricing" element={<LazyRoute><Pricing /></LazyRoute>} />
              <Route path="/info" element={<LazyRoute><Info /></LazyRoute>} />
              <Route path="/blog" element={<LazyRoute><Blog /></LazyRoute>} />
              <Route path="/blog/:id" element={<LazyRoute><BlogPostPage /></LazyRoute>} />
              <Route path="/create-classroom-games" element={<LazyRoute><CreateClassroomGamesPage /></LazyRoute>} />
              <Route path="/classroom-quiz-maker" element={<LazyRoute><ClassroomQuizMakerPage /></LazyRoute>} />
              <Route path="/live-quiz-for-teachers" element={<LazyRoute><LiveQuizForTeachersPage /></LazyRoute>} />
              <Route path="/esl-classroom-games" element={<LazyRoute><EslClassroomGamesPage /></LazyRoute>} />
              <Route path="/contact" element={<LazyRoute><Contact /></LazyRoute>} />
              <Route path="/terms" element={<LazyRoute><Legal type="terms" /></LazyRoute>} />
              <Route path="/privacy" element={<LazyRoute><Legal type="privacy" /></LazyRoute>} />
              <Route path="/profile" element={<LazyRoute><Profile /></LazyRoute>} />
              <Route path="/reset-password" element={<LazyRoute><ResetPassword /></LazyRoute>} />
              <Route path="/choose-plan" element={<LazyRoute><ChangePlan mode="onboarding" /></LazyRoute>} />
              <Route path="/change-plan" element={<LazyRoute><ChangePlan /></LazyRoute>} />
              <Route path="/school-admin" element={<LazyRoute><SchoolAdmin /></LazyRoute>} />
              <Route path="/test" element={<GuardedRoute><LazyRoute><TestBench /></LazyRoute></GuardedRoute>} />
              <Route path="/test/game-cover-smoke" element={import.meta.env.DEV ? <GuardedRoute><LazyRoute><GameCoverSmokeTest /></LazyRoute></GuardedRoute> : <Navigate to="/" replace />} />
              <Route path="/test/game-smoke" element={import.meta.env.DEV ? <GuardedRoute><LazyRoute><GameSmokeTest /></LazyRoute></GuardedRoute> : <Navigate to="/" replace />} />
              <Route path="/test/preview-smoke" element={import.meta.env.DEV ? <GuardedRoute><LazyRoute><PreviewSmokeTest /></LazyRoute></GuardedRoute> : <Navigate to="/" replace />} />
              <Route path="/test/student-practice-smoke" element={import.meta.env.DEV ? <GuardedRoute><LazyRoute><StudentPracticeSmokeTest /></LazyRoute></GuardedRoute> : <Navigate to="/" replace />} />
              <Route path="/test/live-quiz-smoke" element={import.meta.env.DEV ? <GuardedRoute><LazyRoute><LiveQuizSmokeTest /></LazyRoute></GuardedRoute> : <Navigate to="/" replace />} />
              <Route path="/share/game/:id" element={<GuardedRoute><LazyRoute><ShareGame /></LazyRoute></GuardedRoute>} />
              <Route path="/student/game/:id" element={<GuardedRoute><LazyRoute><StudentGame /></LazyRoute></GuardedRoute>} />
              <Route path="/student/share/:shareId" element={<GuardedRoute><LazyRoute><StudentGame /></LazyRoute></GuardedRoute>} />
              <Route path="/live" element={<LazyRoute><LiveQuizCodeEntry /></LazyRoute>} />
              <Route path="/live/host/:sessionId" element={<GuardedRoute title="The live quiz host screen could not be loaded"><LazyRoute><LiveQuizHost /></LazyRoute></GuardedRoute>} />
              <Route path="/live/join/:joinCode" element={<GuardedRoute title="The live quiz join screen could not be loaded"><LazyRoute><LiveQuizJoin /></LazyRoute></GuardedRoute>} />
              <Route path="/live/play/:sessionId/:participantId" element={<GuardedRoute title="The live quiz player screen could not be loaded"><LazyRoute><LiveQuizStudent /></LazyRoute></GuardedRoute>} />
            </Routes>
          </Layout>
      </UnsavedChangesProvider>
    </AuthProvider>
  );
};

// Disposable public section: never mount account providers, onboarding or site navigation.
const AppRoutes: React.FC = () => {
  useUiLanguage();
  const { pathname } = useLocation();
  const isWorkbookRoute = pathname === '/class' || pathname.startsWith('/class/');
  useLayoutEffect(() => {
    if (!isWorkbookRoute) return;
    const root = document.documentElement;
    const previousLanguage = root.getAttribute('lang');
    const previousTranslate = root.getAttribute('translate');
    const hadNoTranslateClass = root.classList.contains('notranslate');
    root.setAttribute('lang', 'en');
    root.setAttribute('translate', 'no');
    root.classList.add('notranslate');
    // Ask browser translation services to leave the whole workbook document alone.
    const existingMeta = document.head.querySelector('meta[name="google"][content="notranslate"]');
    const translationMeta = existingMeta ? null : document.createElement('meta');
    if (translationMeta) {
      translationMeta.name = 'google';
      translationMeta.content = 'notranslate';
      document.head.appendChild(translationMeta);
    }
    return () => {
      if (previousLanguage === null) root.removeAttribute('lang');
      else root.setAttribute('lang', previousLanguage);
      if (previousTranslate === null) root.removeAttribute('translate');
      else root.setAttribute('translate', previousTranslate);
      if (!hadNoTranslateClass) root.classList.remove('notranslate');
      translationMeta?.remove();
    };
  }, [isWorkbookRoute]);
  if (isWorkbookRoute) {
    return <div translate="no" lang="en" className="notranslate"><RouteSEO /><Routes>
      {classBooklets.map(booklet => <Route key={booklet.slug} path={`/class/${booklet.slug}`} element={
        <ErrorBoundary disableTranslation fallbackTitle="The booklet could not be loaded" fallbackMessage="Please reload this page to try again.">
          <LazyRoute preserveEnglish><ClassBooklet key={booklet.slug} booklet={booklet} /></LazyRoute>
        </ErrorBoundary>
      } />)}
      <Route path="*" element={<main className="min-h-screen p-8 text-center"><h1 className="font-display text-2xl">Booklet not found</h1><p>Please use the full link supplied by your teacher.</p></main>} />
    </Routes></div>;
  }
  return <App />;
};

export default function RootApp() { return <Router><AppRoutes /></Router>; }
