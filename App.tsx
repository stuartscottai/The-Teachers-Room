
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { Pricing, Info, Contact, Legal } from './pages/InfoPages';
import { Blog } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { Profile } from './pages/Profile';
import { ChangePlan } from './pages/ChangePlan';
import { TestBench } from './pages/TestBench';
import { ShareGame } from './pages/ShareGame';
import { StudentGame } from './pages/StudentGame';
import { LiveQuizHost } from './pages/LiveQuizHost';
import { LiveQuizJoin } from './pages/LiveQuizJoin';
import { LiveQuizStudent } from './pages/LiveQuizStudent';
import { LiveQuizCodeEntry } from './pages/LiveQuizCodeEntry';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';
import { SchoolAdmin } from './pages/SchoolAdmin';
import { ResetPassword } from './pages/ResetPassword';
import { RouteSEO } from './components/RouteSEO';

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
              <Route path="/games" element={<Games />} />
              <Route path="/worksheets" element={<Navigate to="/games" replace />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/info" element={<Info />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPostPage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Legal type="terms" />} />
              <Route path="/privacy" element={<Legal type="privacy" />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/choose-plan" element={<ChangePlan mode="onboarding" />} />
              <Route path="/change-plan" element={<ChangePlan />} />
              <Route path="/school-admin" element={<SchoolAdmin />} />
              <Route path="/test" element={<TestBench />} />
              <Route path="/share/game/:id" element={<ShareGame />} />
              <Route path="/student/game/:id" element={<StudentGame />} />
              <Route path="/student/share/:shareId" element={<StudentGame />} />
              <Route path="/live" element={<LiveQuizCodeEntry />} />
              <Route path="/live/host/:sessionId" element={<LiveQuizHost />} />
              <Route path="/live/join/:joinCode" element={<LiveQuizJoin />} />
              <Route path="/live/play/:sessionId/:participantId" element={<LiveQuizStudent />} />
            </Routes>
          </Layout>
        </Router>
      </UnsavedChangesProvider>
    </AuthProvider>
  );
};

export default App;
