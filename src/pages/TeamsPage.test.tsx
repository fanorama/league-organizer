import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getCache, KEYS, saveCache, setAll } from '../lib/storage';
import type { League } from '../lib/types';
import { useLeagueStore } from '../store/useLeagueStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';
import { TeamsPage } from './TeamsPage';

const league: League = {
  id: 'league-1',
  name: 'Weekend League',
  createdAt: '2026-05-28T00:00:00.000Z',
  settings: { meetingsPerSeason: 1, continuousSeasons: false },
};

function renderTeamsPage() {
  render(
    <MemoryRouter initialEntries={['/league/league-1/teams']}>
      <Routes>
        <Route path="/league/:id/teams" element={<TeamsPage />} />
        <Route path="/settings" element={<div>Settings route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  setAll(KEYS.leagues, [league]);
  setAll(KEYS.teams, []);
  setAll(KEYS.players, []);
  useLeagueStore.getState().refresh();
  useTeamStore.getState().refresh();
  usePlayerStore.getState().refresh();
});

describe('TeamsPage', () => {
  it('opens club import without requiring browser-stored API settings', async () => {
    renderTeamsPage();

    await userEvent.click(screen.getByRole('button', { name: 'Import clubs' }));

    expect(screen.getByRole('heading', { name: 'Import clubs' })).toBeInTheDocument();
    expect(screen.queryByText('Settings route')).not.toBeInTheDocument();
  });

  it('clears the imported clubs cache from the teams page', async () => {
    saveCache({ '39:2024': { data: [{ id: '42', name: 'Arsenal' }], fetchedAt: '2026-05-28T00:00:00.000Z' } });
    renderTeamsPage();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh cache' }));

    expect(getCache()).toEqual({});
  });
});
