import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClubPickerModal } from './ClubPickerModal';
import { fetchClubs } from '../lib/api';
import type { ClubFromApi } from '../lib/types';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    fetchClubs: vi.fn(),
  };
});

const clubs: ClubFromApi[] = [
  { id: 'ars', name: 'Arsenal', shortName: 'ARS', logo: '/arsenal.png' },
  { id: 'che', name: 'Chelsea', shortName: 'CHE', logo: '/chelsea.png' },
];

describe('ClubPickerModal', () => {
  it('confirms the selected clubs for both players', async () => {
    vi.mocked(fetchClubs).mockResolvedValue(clubs);
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ClubPickerModal
        player1Name="Adit"
        player2Name="Bima"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Pilih Arsenal untuk Adit' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pilih Arsenal untuk Adit' }));
    await user.click(screen.getByRole('button', { name: 'Pilih Chelsea untuk Bima' }));
    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(clubs[0], clubs[1], 'PL', 'PL');
    });
  });

  it('P2 dapat mengganti kompetisi tanpa mereset pilihan P1', async () => {
    const serieAClubs: ClubFromApi[] = [
      { id: 'int', name: 'Inter', shortName: 'INT', logo: '/inter.png' },
      { id: 'mil', name: 'Milan', shortName: 'MIL', logo: '/milan.png' },
    ];
    vi.mocked(fetchClubs).mockImplementation(async (competitionId) => {
      return competitionId === 'SA' ? serieAClubs : clubs;
    });
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ClubPickerModal
        player1Name="Adit"
        player2Name="Bima"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    // P1 picks Arsenal from Premier League
    await user.click(await screen.findByRole('button', { name: 'Pilih Arsenal untuk Adit' }));

    // P2 switches to Serie A
    await user.selectOptions(screen.getByLabelText('Kompetisi Bima'), 'Serie A');

    // P2's grid now shows Serie A clubs
    expect(await screen.findByRole('button', { name: 'Pilih Inter untuk Bima' })).toBeInTheDocument();

    // Konfirmasi is disabled until P2 also picks
    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeDisabled();

    // P2 picks Inter from Serie A
    await user.click(screen.getByRole('button', { name: 'Pilih Inter untuk Bima' }));
    await user.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    expect(onConfirm).toHaveBeenCalledWith(clubs[0], serieAClubs[0], 'PL', 'SA');
  });

  it('grid pemain tetap pada kompetisi terbaru ketika fetch sebelumnya selesai lebih lambat', async () => {
    const serieAClubs: ClubFromApi[] = [
      { id: 'int', name: 'Inter', shortName: 'INT', logo: '/inter.png' },
      { id: 'mil', name: 'Milan', shortName: 'MIL', logo: '/milan.png' },
    ];
    let resolvePremierLeague: (value: ClubFromApi[]) => void = () => undefined;
    // P1 initial fetch (PL) is delayed; everything else resolves immediately with appropriate data
    vi.mocked(fetchClubs)
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePremierLeague = resolve; }))
      .mockResolvedValue(serieAClubs);
    const user = userEvent.setup();

    render(
      <ClubPickerModal
        player1Name="Adit"
        player2Name="Bima"
        initialP2CompetitionId="SA"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // P1 switches to Serie A while their PL fetch is still pending
    await user.selectOptions(screen.getByLabelText('Kompetisi Adit'), 'Serie A');

    // P1's grid shows Serie A clubs
    expect(await screen.findByRole('button', { name: 'Pilih Inter untuk Adit' })).toBeInTheDocument();

    // Late PL fetch resolves — should NOT overwrite Serie A clubs in P1's grid
    await act(async () => {
      resolvePremierLeague(clubs);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: 'Pilih Inter untuk Adit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pilih Arsenal untuk Adit' })).not.toBeInTheDocument();
  });
});
