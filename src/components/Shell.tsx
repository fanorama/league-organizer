import { type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface ShellProps {
  active: 'leagues' | 'players' | 'quick-match';
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ active, title, actions, children }: ShellProps) {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const setSession = useAuthStore((state) => state.setSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleMobileLogout() {
    closeMenu();
    await handleLogout();
  }

  function handleMobileNav(to: string) {
    closeMenu();
    navigate(to);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" to="/" onClick={closeMenu}>
            <span className="brand-mark">⚽</span>
            <span className="brand-name">LeagueOrg</span>
          </Link>
          <nav className="top-nav">
            <Link className={active === 'leagues' ? 'active' : ''} to="/">
              Leagues
            </Link>
            <Link className={active === 'players' ? 'active' : ''} to="/players">
              Players
            </Link>
            <Link className={active === 'quick-match' ? 'active' : ''} to="/quick-match">
              Quick Match
            </Link>
          </nav>
          {isAdmin ? (
            <button className="btn btn-xs header-logout" type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link className="btn btn-xs header-logout" to="/login">
              Login
            </Link>
          )}
          <button
            className={`hamburger-btn${menuOpen ? ' is-open' : ''}`}
            type="button"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-nav" role="navigation" aria-label="Menu navigasi">
          <button
            type="button"
            className={`mobile-nav-link${active === 'leagues' ? ' active' : ''}`}
            onClick={() => handleMobileNav('/')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            Liga
          </button>
          <button
            type="button"
            className={`mobile-nav-link${active === 'players' ? ' active' : ''}`}
            onClick={() => handleMobileNav('/players')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Pemain
          </button>
          <button
            type="button"
            className={`mobile-nav-link${active === 'quick-match' ? ' active' : ''}`}
            onClick={() => handleMobileNav('/quick-match')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
            Quick Match
          </button>
          {isAdmin ? (
            <button type="button" className="mobile-nav-link mobile-nav-logout" onClick={handleMobileLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          ) : (
            <button type="button" className="mobile-nav-link" onClick={() => handleMobileNav('/login')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Login
            </button>
          )}
        </div>
      )}

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-actions">{actions}</div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
