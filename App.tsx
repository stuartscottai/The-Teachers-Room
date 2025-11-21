import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Games } from './pages/Games';
import { Worksheets } from './pages/Worksheets';
import { Pricing, Info, Contact, Legal } from './pages/InfoPages';
import { Blog } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { AuthProvider } from './contexts/AuthContext';
import { UnsavedChangesProvider } from './contexts/UnsavedChangesContext';

const App: React.FC = () => {
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
            </Routes>
          </Layout>
        </Router>
      </UnsavedChangesProvider>
    </AuthProvider>
  );
};

export default App;