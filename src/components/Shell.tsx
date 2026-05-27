import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ShellProps {
  active: 'leagues' | 'settings';
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ active, title, actions, children }: ShellProps) {
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
            <Link className={active === 'settings' ? 'active' : ''} to="/settings">
              Settings
            </Link>
          </nav>
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
