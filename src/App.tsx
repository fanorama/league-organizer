import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { LeaguePage } from './pages/LeaguePage';
import { LeaguesPage } from './pages/LeaguesPage';
import { LoginPage } from './pages/LoginPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { QuickMatchPage } from './pages/QuickMatchPage';
import { ClubsPage } from './pages/ClubsPage';
import { CompetitionsPage } from './pages/CompetitionsPage';
import { CompetitionPage } from './pages/CompetitionPage';
import { QuickMatchSessionPage } from './pages/QuickMatchSessionPage';
import { SeasonPage } from './pages/SeasonPage';
import { TeamsPage } from './pages/TeamsPage';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [setSession]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LeaguesPage />} />
        <Route path="/league/:id" element={<LeaguePage />} />
        <Route path="/league/:id/teams" element={<TeamsPage />} />
        <Route path="/league/:id/season/:seasonId" element={<SeasonPage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/competition/:id" element={<CompetitionPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/quick-match" element={<QuickMatchPage />} />
        <Route path="/quick-match/:sessionId" element={<QuickMatchSessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
