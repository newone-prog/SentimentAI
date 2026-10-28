import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BarChart3,
  Activity,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
  Menu,
  X,
} from 'lucide-react';

interface NavigationProps {
  view: 'main' | 'terminal';
  setView: (view: 'main' | 'terminal') => void;
  authLoading: boolean;
  isAuthenticated: boolean;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  login: () => Promise<any>;
  logout: () => Promise<void>;
}

export const Navigation: React.FC<NavigationProps> = ({
  view,
  setView,
  authLoading,
  isAuthenticated,
  user,
  login,
  logout,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const desktopUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = desktopUserMenuRef.current?.contains(target);
      const insideMobile = mobileUserMenuRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMobileNav) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileNav]);

  return (
    <>
      <nav className={`nav-fixed ${scrolled || view === 'terminal' ? 'nav-scrolled' : ''}`}>
        <div className="nav-logo flex items-center gap-2 cursor-pointer" onClick={() => setView('main')}>
          <Sparkles className="w-5 h-5 text-[#C4A77D]" />
          SentimentAI
        </div>
        <div className="nav-links">
          <button onClick={() => setView('main')} className={`nav-link ${view === 'main' ? 'text-[#C4A77D]' : ''}`}>Dashboard</button>
          <button onClick={() => setView('terminal')} className={`nav-link ${view === 'terminal' ? 'text-[#C4A77D]' : ''}`}>Terminal</button>
          <div className="nav-auth-divider" />
          {authLoading ? (
            <div className="nav-auth-loading"><Loader2 className="w-4 h-4 animate-spin text-[#C4A77D]" /></div>
          ) : isAuthenticated && user ? (
            <div ref={desktopUserMenuRef} className="nav-user-wrapper">
              <button className="nav-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="nav-user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="nav-user-avatar-fallback"><UserIcon className="w-4 h-4" /></div>
                )}
              </button>
              {showUserMenu && (
                <div className="nav-user-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="nav-user-dropdown-header">
                    <span className="nav-user-dropdown-name">{user.displayName || 'Investor'}</span>
                    <span className="nav-user-dropdown-email">{user.email || ''}</span>
                  </div>
                  <div className="nav-user-dropdown-divider" />
                   <button 
                     className="nav-user-dropdown-item" 
                     onClick={async (e) => { 
                       e.preventDefault();
                       e.stopPropagation();
                       setShowUserMenu(false); 
                       await logout(); 
                     }}
                   >
                     <LogOut className="w-4 h-4" />
                     Sign Out
                   </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login-btn" onClick={() => login()}>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
        <div className="nav-mobile-actions">
          {isAuthenticated && user ? (
            <div ref={mobileUserMenuRef} className="nav-user-wrapper">
              <button className="nav-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="nav-user-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="nav-user-avatar-fallback"><UserIcon className="w-4 h-4" /></div>
                )}
              </button>
              {showUserMenu && (
                <div className="nav-user-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="nav-user-dropdown-header">
                    <span className="nav-user-dropdown-name">{user.displayName || 'Investor'}</span>
                    <span className="nav-user-dropdown-email">{user.email || ''}</span>
                  </div>
                  <div className="nav-user-dropdown-divider" />
                   <button 
                     className="nav-user-dropdown-item" 
                     onClick={async (e) => { 
                       e.preventDefault();
                       e.stopPropagation();
                       setShowUserMenu(false); 
                       await logout(); 
                     }}
                   >
                     <LogOut className="w-4 h-4" />
                     Sign Out
                   </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-login-btn" onClick={() => login()}>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
          <button className="nav-hamburger" onClick={() => setShowMobileNav(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {showMobileNav && (
        <div className="mobile-nav-overlay" onClick={() => setShowMobileNav(false)}>
          <div className="mobile-nav-fullscreen" onClick={e => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C4A77D]" />
                <span className="font-display text-xl text-white">SentimentAI</span>
              </div>
              <button className="mobile-nav-close" onClick={() => setShowMobileNav(false)} aria-label="Close menu">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <nav className="mobile-nav-links">
              <button onClick={() => { setView('main'); setShowMobileNav(false); }} className="mobile-nav-link">
                <BarChart3 className="w-5 h-5" />
                Dashboard
              </button>
              <button onClick={() => { setView('terminal'); setShowMobileNav(false); }} className="mobile-nav-link">
                <Activity className="w-5 h-5" />
                Terminal
              </button>
              <div className="h-[1px] bg-white/10 my-4" />
              {isAuthenticated ? (
                <button 
                  onClick={async () => { setShowMobileNav(false); await logout(); }} 
                  className="mobile-nav-link text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out ({user?.displayName || user?.email || 'User'})
                </button>
              ) : (
                <button 
                  onClick={async () => { setShowMobileNav(false); await login(); }} 
                  className="mobile-nav-link text-[#C4A77D]"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In with Google
                </button>
              )}
            </nav>
            <div className="mobile-nav-footer">
              <p className="text-white/20 text-[10px] font-mono uppercase tracking-[0.2em]">
                Powered by 5 Data Sources &bull; AI-Driven
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
