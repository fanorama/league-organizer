import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getCache, getMatchesByTeamId, saveCache } from '../lib/storage';
import type { League, Team } from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';
import { useLeagueStore } from '../store/useLeagueStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';
import { TeamsPage } from './TeamsPage';

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (...args: any[]) => void }) => children,
  Draggable: ({ children }: { children: (provided: any, snapshot: any) => React.ReactNode }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
  Droppable: ({ children }: { children: (provided: any, snapshot: any) => React.ReactNode }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
}));

const league = vi.hoisted<League>(() => ({
  id: 'league-1',
  name: 'Weekend League',
  createdAt: '2026-05-28T00:00:00.000Z',
  settings: { meetingsPerSeason: 1, continuousSeasons: false },
}));

vi.mock('../lib/storage', async () => {
  const actual = await vi.importActual<typeof import('../lib/storage')>('../lib/storage');
  return {
    ...actual,
    getLeagues: vi.fn().mockResolvedValue([league]),
    getTeams: vi.fn().mockResolvedValue([]),
    getPlayers: vi.fn().mockResolvedValue([]),
    getMatchesByTeamId: vi.fn().mockResolvedValue([]),
  };
});

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
  useAuthStore.setState({ session: {} as never, isAdmin: true });
  useLeagueStore.setState({ leagues: [league] });
  useTeamStore.setState({ teams: [] });
  usePlayerStore.setState({ players: [] });
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

  it('blocks deletion of team with match history', async () => {
    const poolTeam: Team = { id: 't1', leagueId: 'league-1', name: 'Arsenal', status: 'pool', shortName: 'ARS', badge: 'ARS' };
    const { getTeams } = await import('../lib/storage');
    vi.mocked(getTeams).mockResolvedValue([poolTeam]);
    vi.mocked(getMatchesByTeamId).mockResolvedValue([{ id: 'm1' } as any]);
    useTeamStore.setState({ teams: [poolTeam] });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderTeamsPage();

    const removeBtn = await screen.findByRole('button', { name: 'Remove' });
    await userEvent.click(removeBtn);

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('riwayat pertandingan'));
    });
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });
});
