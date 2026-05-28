import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchClubs } from '../lib/api';
import * as storage from '../lib/storage';
import type { ClubFromApi, Player, QuickMatchGame, QuickMatchSession } from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQuickMatchStore } from '../store/useQuickMatchStore';
import { QuickMatchSessionPage } from './QuickMatchSessionPage';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    fetchClubs: vi.fn(),
  };
});

vi.mock('../lib/storage');

const players: Player[] = [
  { id: 'p1', name: 'Adit', createdAt: '2026-05-28T01:00:00Z' },
  { id: 'p2', name: 'Bima', createdAt: '2026-05-28T01:00:00Z' },
];

const session: QuickMatchSession = {
  id: 's1',
  player1Id: 'p1',
  player2Id: 'p2',
  status: 'active',
  createdAt: '2026-05-28T01:00:00Z',
  finishedAt: null,
};

const clubs: ClubFromApi[] = [
  { id: 'ars', name: 'Arsenal', shortName: 'ARS', logo: '/arsenal.png' },
  { id: 'che', name: 'Chelsea', shortName: 'CHE', logo: '/chelsea.png' },
];

const savedGame: QuickMatchGame = {
  id: 'g1',
  sessionId: 's1',
  player1Club: { id: 'ars', name: 'Arsenal', logo: '/arsenal.png' },
  player2Club: { id: 'che', name: 'Chelsea', logo: '/chelsea.png' },
  player1Score: 2,
  player2Score: 1,
  createdAt: '2026-05-28T01:20:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getPlayers).mockResolvedValue(players);
  vi.mocked(storage.getQuickMatchSessions).mockResolvedValue([session]);
  vi.mocked(storage.getQuickMatchGamesBySession).mockResolvedValue([]);
  vi.mocked(storage.saveQuickMatchGame).mockResolvedValue(savedGame);
  vi.mocked(fetchClubs).mockResolvedValue(clubs);
  useAuthStore.setState({ session: {} as never, isAdmin: true });
  usePlayerStore.setState({ players: [] });
  useQuickMatchStore.setState({ sessions: [], gamesBySession: {} });
});

describe('QuickMatchSessionPage', () => {
  it('adds a game with clubs selected from the picker modal', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/quick-match/s1']}>
        <Routes>
          <Route path="/quick-match/:sessionId" element={<QuickMatchSessionPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Adit vs Bima' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pilih Klub' }));
    await user.click(await screen.findByRole('button', { name: 'Pilih Arsenal untuk Adit' }));
    await user.click(screen.getByRole('button', { name: 'Pilih Chelsea untuk Bima' }));
    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();

    await user.type(screen.getByRole('spinbutton', { name: 'Skor Adit' }), '2');
    await user.type(screen.getByRole('spinbutton', { name: 'Skor Bima' }), '1');
    await user.click(screen.getByRole('button', { name: 'Simpan game' }));

    await waitFor(() => {
      expect(storage.saveQuickMatchGame).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 's1',
        player1Club: { id: 'ars', name: 'Arsenal', logo: '/arsenal.png' },
        player2Club: { id: 'che', name: 'Chelsea', logo: '/chelsea.png' },
        player1Score: 2,
        player2Score: 1,
      }));
    });
  });
});
