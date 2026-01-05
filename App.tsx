
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { Worksheets } from './pages/Worksheets';
import { Pricing, Info, Contact, Legal } from './pages/InfoPages';
import { Blog } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { Profile } from './pages/Profile';
import { TestBench } from './pages/TestBench';
import { AuthProvider } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';

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
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<Games />} />
              <Route path="/worksheets" element={<Worksheets />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/info" element={<Info />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPostPage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Legal type="terms" />} />
              <Route path="/privacy" element={<Legal type="privacy" />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/test" element={<TestBench />} />
            </Routes>
          </Layout>
        </Router>
      </UnsavedChangesProvider>
    </AuthProvider>
  );
};

export default App;
