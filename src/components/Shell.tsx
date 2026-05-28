import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface ShellProps {
  active: 'leagues' | 'players';
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ active, title, actions, children }: ShellProps) {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const setSession = useAuthStore((state) => state.setSession);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" to="/">
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
            {!isAdmin ? (
              <Link to="/login">Login</Link>
            ) : null}
          </nav>
          {isAdmin ? (
            <div className="admin-bar">
              <span className="admin-badge">Admin</span>
              <button className="btn btn-xs" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>
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
