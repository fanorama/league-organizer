import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    setSession(data.session);
    setLoading(false);
    navigate('/');
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">⚽</div>
          <span className="login-app-name">League Organizer</span>
          <p className="login-tagline">Admin Portal</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <div className="login-error" role="alert">
              <span className="login-error-icon">!</span>
              {error}
            </div>
          ) : null}
          <button className="btn primary login-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
          <Link to="/" className="login-back-link">
            ← Kembali ke Home
          </Link>
        </form>
      </div>
    </div>
  );
}
