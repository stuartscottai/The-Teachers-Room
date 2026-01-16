
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, BookOpen, GraduationCap, HelpCircle, MessageSquare, FileText, Home, LogIn, Grid, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { LoginModal } from './LoginModal';
import { Avatar } from './Avatar';

// SafeLink Component to intercept navigation if changes are unsaved
const SafeLink: React.FC<{ to: string; children: React.ReactNode; className?: string; onClick?: () => void; state?: any }> = ({ to, children, className, onClick, state }) => {
    const { isDirty, setIsDirty, confirmAction } = useUnsavedChanges();
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === to;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isActive && !state) return; // Don't navigate if already there unless checking for state changes

        const performNavigation = () => {
            setIsDirty(false); // Clear dirty state on confirmed navigation
            if (onClick) onClick();
            navigate(to, { state });
        };

        if (isDirty) {
            confirmAction(
                "You have unsaved changes. Are you sure you want to leave? Your progress will be lost.",
                performNavigation
            );
        } else {
            performNavigation();
        }
    };

    return (
        <a href={to} onClick={handleClick} className={className}>
            {children}
        </a>
    );
};

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Games', path: '/games', icon: <GraduationCap size={18} /> },
    { name: 'Worksheets', path: '/worksheets', icon: <FileText size={18} /> },
    { name: 'Pricing', path: '/pricing', icon: <BookOpen size={18} /> },
    { name: 'Info', path: '/info', icon: <HelpCircle size={18} /> },
    { name: 'Blog', path: '/blog', icon: <MessageSquare size={18} /> },
    { name: 'Contact', path: '/contact', icon: <User size={18} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
    <nav className="bg-white sticky top-0 z-[100] shadow-sm border-b border-slate-100 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <SafeLink to="/" className="flex-shrink-0 flex items-center">
              <div className="bg-brand-yellow p-2 rounded-full mr-2 shadow-sm">
                <GraduationCap className="h-6 w-6 text-sky-900" />
              </div>
              <span className="font-display font-bold text-xl text-slate-800">The Teachers' Room</span>
            </SafeLink>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <SafeLink
                key={item.name}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer
                  ${isActive(item.path) 
                    ? 'bg-sky-50 text-sky-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {item.icon}
                {item.name}
              </SafeLink>
            ))}
            <div className="ml-4 pl-4 border-l border-slate-200 relative">
              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-slate-700 hover:text-brand-blue relative z-[101]"
                  >
                    <Avatar
                      name={user.name}
                      src={user.avatar}
                      className="w-8 h-8 border border-slate-200"
                      textClassName="text-[10px]"
                    />
                    <span className="font-bold text-sm max-w-[100px] truncate">{user.name}</span>
                  </button>
                  
                  {showUserMenu && (
                     <>
                     {/* Backdrop to close menu when clicking outside */}
                     <div className="fixed inset-0 z-[100]" onClick={() => setShowUserMenu(false)} />
                     <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-[102] animate-fade-in">
                        <div className="px-4 py-2 border-b border-slate-50 mb-2">
                          <p className="text-xs text-slate-400 uppercase">Signed in as</p>
                          <p className="font-bold text-slate-800 truncate">{user.email}</p>
                        </div>
                        <SafeLink 
                          to="/profile" 
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 flex items-center w-full"
                        >
                          <User size={16} className="mr-2 text-brand-blue" /> My Profile
                        </SafeLink>
                        <SafeLink 
                          to="/games" 
                          state={{ view: 'library' }}
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 flex items-center w-full"
                        >
                          <Grid size={16} className="mr-2 text-brand-blue" /> My Saved Games
                        </SafeLink>
                        <SafeLink 
                          to="/worksheets" 
                          state={{ tab: 'library' }}
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-3 text-sm text-slate-700 hover:bg-sky-50 flex items-center w-full"
                        >
                          <FileText size={16} className="mr-2 text-brand-blue" /> My Saved Worksheets
                        </SafeLink>
                        <button 
                          onClick={() => { logout(); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <LogOut size={16} className="mr-2" /> Sign Out
                        </button>
                     </div>
                     </>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setShowLogin(true)}
                  className="text-slate-500 hover:text-brand-accent transition-colors"
                >
                  <div className="bg-slate-100 p-2 rounded-full hover:bg-sky-50 hover:text-sky-600 transition-colors flex items-center gap-2 px-4">
                     <User size={20} />
                     <span className="text-sm font-bold">Login</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <SafeLink
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2
                  ${isActive(item.path)
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {item.icon}
                {item.name}
              </SafeLink>
            ))}
            <div className="border-t border-slate-100 pt-3 mt-3">
                {user ? (
                  <>
                    <div className="flex items-center px-3 py-2">
                       <Avatar
                         name={user.name}
                         src={user.avatar}
                         className="w-8 h-8 mr-2"
                         textClassName="text-[10px]"
                       />
                       <span className="font-bold text-slate-800">{user.name}</span>
                    </div>
                    <SafeLink to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:text-sky-600">
                        My Profile
                    </SafeLink>
                    <SafeLink to="/games" state={{ view: 'library' }} onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:text-sky-600">
                        My Saved Games
                    </SafeLink>
                    <SafeLink to="/worksheets" state={{ tab: 'library' }} onClick={() => setIsOpen(false)} className="block px-3 py-2 text-slate-600 hover:text-sky-600">
                        My Saved Worksheets
                    </SafeLink>
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-red-600 font-medium hover:bg-red-50">Sign Out</button>
                  </>
                ) : (
                  <button 
                    onClick={() => { setShowLogin(true); setIsOpen(false); }}
                    className="w-full text-left px-3 py-2 text-slate-600 font-medium hover:text-sky-600"
                  >
                    Login / Sign Up
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </nav>

    <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Site</h3>
            <ul className="space-y-3">
              <li><SafeLink to="/games" className="hover:text-brand-yellow text-sm transition-colors">Games</SafeLink></li>
              <li><SafeLink to="/worksheets" className="hover:text-brand-yellow text-sm transition-colors">Worksheets</SafeLink></li>
              <li><SafeLink to="/pricing" className="hover:text-brand-yellow text-sm transition-colors">Pricing</SafeLink></li>
              <li><SafeLink to="/blog" className="hover:text-brand-yellow text-sm transition-colors">Blog</SafeLink></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-3">
              <li><SafeLink to="/info" className="hover:text-brand-yellow text-sm transition-colors">FAQs</SafeLink></li>
              <li><SafeLink to="/contact" className="hover:text-brand-yellow text-sm transition-colors">Contact</SafeLink></li>
            </ul>
          </div>
           <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><SafeLink to="/terms" className="hover:text-brand-yellow text-sm transition-colors">Terms of Service</SafeLink></li>
              <li><SafeLink to="/privacy" className="hover:text-brand-yellow text-sm transition-colors">Privacy Policy</SafeLink></li>
            </ul>
          </div>
           <div className="col-span-2 md:col-span-1">
             <div className="flex items-center mb-4">
                <div className="bg-brand-yellow p-2 rounded-full mr-2">
                  <GraduationCap className="h-5 w-5 text-slate-900" />
                </div>
                <span className="font-display font-bold text-lg text-white">The Teachers' Room</span>
             </div>
             <p className="text-xs text-slate-400">Making teaching easier, one game at a time.</p>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-slate-500">© 2025 The Teachers' Room.</p>
          <p className="text-xs text-slate-500 mt-2 md:mt-0">Designed and managed by 3P Machine digital.</p>
        </div>
      </div>
    </footer>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col font-sans selection:bg-brand-yellow selection:text-slate-900">
      <Navbar />
      <main className="bg-white relative z-0">
        {children}
      </main>
      <Footer />
    </div>
  );
};
