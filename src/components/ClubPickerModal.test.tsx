import { render, screen, waitFor } from '@testing-library/react';
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
      expect(onConfirm).toHaveBeenCalledWith(clubs[0], clubs[1], '39');
    });
  });

  it('resets selections when switching competition tabs', async () => {
    const serieAClubs: ClubFromApi[] = [
      { id: 'int', name: 'Inter', shortName: 'INT', logo: '/inter.png' },
      { id: 'mil', name: 'Milan', shortName: 'MIL', logo: '/milan.png' },
    ];
    vi.mocked(fetchClubs)
      .mockResolvedValueOnce(clubs)
      .mockResolvedValueOnce(serieAClubs);
    const user = userEvent.setup();

    render(
      <ClubPickerModal
        player1Name="Adit"
        player2Name="Bima"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Pilih Arsenal untuk Adit' }));
    await user.click(screen.getByRole('button', { name: 'Pilih Chelsea untuk Bima' }));
    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Serie A' }));

    expect(await screen.findByRole('button', { name: 'Pilih Inter untuk Adit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Pilih Arsenal untuk Adit' })).not.toBeInTheDocument();
  });
});
