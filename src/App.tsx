import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LeaguePage } from './pages/LeaguePage';
import { LeaguesPage } from './pages/LeaguesPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { SeasonPage } from './pages/SeasonPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamsPage } from './pages/TeamsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LeaguesPage />} />
        <Route path="/league/:id" element={<LeaguePage />} />
        <Route path="/league/:id/teams" element={<TeamsPage />} />
        <Route path="/league/:id/season/:seasonId" element={<SeasonPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
