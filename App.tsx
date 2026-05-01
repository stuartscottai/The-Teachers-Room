
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';
import { RouteSEO } from './components/RouteSEO';
import { ErrorBoundary } from './components/ErrorBoundary';

const Games = lazy(() => import('./pages/Games').then(({ Games }) => ({ default: Games })));
const Pricing = lazy(() => import('./pages/InfoPages').then(({ Pricing }) => ({ default: Pricing })));
const Info = lazy(() => import('./pages/InfoPages').then(({ Info }) => ({ default: Info })));
const Contact = lazy(() => import('./pages/InfoPages').then(({ Contact }) => ({ default: Contact })));
const Legal = lazy(() => import('./pages/InfoPages').then(({ Legal }) => ({ default: Legal })));
const Blog = lazy(() => import('./pages/Blog').then(({ Blog }) => ({ default: Blog })));
const BlogPostPage = lazy(() => import('./pages/BlogPost').then(({ BlogPostPage }) => ({ default: BlogPostPage })));
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

const RouteLoading: React.FC = () => (
  <div className="min-h-[40vh] flex items-center justify-center px-6 text-center">
    <p className="text-sm font-semibold text-slate-500">Loading...</p>
  </div>
);

const LazyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<RouteLoading />}>{children}</Suspense>
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
        <Router>
          <LegacyHashRouteRedirect />
          <RouteSEO />
          <AccountTierOnboardingRedirect />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<GuardedRoute><LazyRoute><Games /></LazyRoute></GuardedRoute>} />
              <Route path="/worksheets" element={<Navigate to="/games" replace />} />
              <Route path="/pricing" element={<LazyRoute><Pricing /></LazyRoute>} />
              <Route path="/info" element={<LazyRoute><Info /></LazyRoute>} />
              <Route path="/blog" element={<LazyRoute><Blog /></LazyRoute>} />
              <Route path="/blog/:id" element={<LazyRoute><BlogPostPage /></LazyRoute>} />
              <Route path="/contact" element={<LazyRoute><Contact /></LazyRoute>} />
              <Route path="/terms" element={<LazyRoute><Legal type="terms" /></LazyRoute>} />
              <Route path="/privacy" element={<LazyRoute><Legal type="privacy" /></LazyRoute>} />
              <Route path="/profile" element={<LazyRoute><Profile /></LazyRoute>} />
              <Route path="/reset-password" element={<LazyRoute><ResetPassword /></LazyRoute>} />
              <Route path="/choose-plan" element={<LazyRoute><ChangePlan mode="onboarding" /></LazyRoute>} />
              <Route path="/change-plan" element={<LazyRoute><ChangePlan /></LazyRoute>} />
              <Route path="/school-admin" element={<LazyRoute><SchoolAdmin /></LazyRoute>} />
              <Route path="/test" element={<GuardedRoute><LazyRoute><TestBench /></LazyRoute></GuardedRoute>} />
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
        </Router>
      </UnsavedChangesProvider>
    </AuthProvider>
  );
};

export default App;
