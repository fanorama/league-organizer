import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { Competition, CompetitionMatch, CompetitionParticipant, CompetitionSettings } from '../lib/types';
import { useCompetitionStore } from './useCompetitionStore';

vi.mock('../lib/storage');

const settings: CompetitionSettings = {
  groupCount: 2,
  meetingsPerPair: 1,
  qualifyMode: 'top1',
  knockoutLegs: 1,
  potCount: 1,
};

const competition: Competition = {
  id: 'c1',
  name: 'World Cup',
  status: 'setup',
  settings,
  createdAt: '2026-01-01T00:00:00Z',
};

function participant(id: string, overrides: Partial<CompetitionParticipant> = {}): CompetitionParticipant {
  return { id, competitionId: 'c1', playerId: `pl-${id}`, clubName: `Club ${id}`, clubTier: 'mid', ...overrides };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getCompetitions).mockResolvedValue([]);
  vi.mocked(storage.getCompetitionById).mockResolvedValue(competition);
  vi.mocked(storage.getParticipantsByCompetition).mockResolvedValue([]);
  vi.mocked(storage.getCompetitionMatchesByCompetition).mockResolvedValue([]);
  vi.mocked(storage.saveCompetition).mockImplementation(async (c) => ({ ...(c as Competition) }));
  vi.mocked(storage.saveParticipant).mockImplementation(async (p) => ({ ...(p as CompetitionParticipant), id: (p as CompetitionParticipant).id ?? 'new' }));
  vi.mocked(storage.saveParticipants).mockResolvedValue([]);
  vi.mocked(storage.saveCompetitionMatches).mockResolvedValue([]);
  vi.mocked(storage.saveCompetitionMatch).mockImplementation(async (m) => ({ ...(m as CompetitionMatch), id: (m as CompetitionMatch).id ?? 'm' }));
  useCompetitionStore.setState({ competitions: [], competition: null, participants: [], matches: [] });
});

describe('useCompetitionStore CRUD', () => {
  it('createCompetition memanggil saveCompetition dengan status setup', async () => {
    await useCompetitionStore.getState().createCompetition('World Cup', undefined, settings);
    expect(storage.saveCompetition).toHaveBeenCalledWith(expect.objectContaining({ status: 'setup', name: 'World Cup' }));
  });

  it('addParticipant menolak duplikat player', async () => {
    useCompetitionStore.setState({ competition, participants: [participant('a', { playerId: 'pl-x' })] });
    await expect(useCompetitionStore.getState().addParticipant('c1', 'pl-x')).rejects.toThrow(/sudah terdaftar/);
  });
});

describe('useCompetitionStore updateCompetitionSettings', () => {
  it('merge patch ke settings saat status setup tanpa menghapus field lain', async () => {
    useCompetitionStore.setState({ competition });

    const pool = [{ externalId: 'x', name: 'X', logo: null }, { externalId: 'y', name: 'Y', logo: null }];
    await useCompetitionStore.getState().updateCompetitionSettings('c1', { clubPool: pool });

    const saved = vi.mocked(storage.saveCompetition).mock.calls[0][0] as Competition;
    expect(saved.settings.clubPool).toEqual(pool);
    expect(saved.settings.groupCount).toBe(2);
    expect(saved.settings.qualifyMode).toBe('top1');
  });

  it('menolak bila status bukan setup', async () => {
    useCompetitionStore.setState({ competition: { ...competition, status: 'draw_clubs' } });
    await expect(
      useCompetitionStore.getState().updateCompetitionSettings('c1', { groupCount: 4 }),
    ).rejects.toThrow(/fase setup/);
  });
});

describe('useCompetitionStore transisi', () => {
  it('finishClubDraw menolak bila ada peserta tanpa klub', async () => {
    useCompetitionStore.setState({ competition, participants: [participant('a', { clubName: null })] });
    await expect(useCompetitionStore.getState().finishClubDraw('c1')).rejects.toThrow(/klub/);
  });

  it('runGroupDraw mengundi grup, menjadwalkan match, dan set status group_stage', async () => {
    const participants = ['a', 'b', 'c', 'd'].map((id) => participant(id));
    useCompetitionStore.setState({ competition: { ...competition, status: 'group_draw' }, participants, matches: [] });

    await useCompetitionStore.getState().runGroupDraw('c1', () => 0);

    expect(storage.saveParticipants).toHaveBeenCalled();
    expect(storage.saveCompetitionMatches).toHaveBeenCalled();
    expect(storage.saveCompetition).toHaveBeenCalledWith(expect.objectContaining({ status: 'group_stage' }));
  });

  it('startKnockout menolak bila match grup belum selesai', async () => {
    const participants = ['a', 'b'].map((id) => participant(id));
    const groups = [{ key: 'A', participantIds: ['a', 'b'] }];
    const matches: CompetitionMatch[] = [
      { id: 'm1', competitionId: 'c1', stage: 'group', groupKey: 'A', homeParticipantId: 'a', awayParticipantId: 'b', status: 'scheduled' },
    ];
    useCompetitionStore.setState({ competition: { ...competition, status: 'group_stage', groups }, participants, matches });
    await expect(useCompetitionStore.getState().startKnockout('c1')).rejects.toThrow(/match grup/);
  });

  it('startKnockout membuat bracket saat semua match grup selesai', async () => {
    const participants = ['a', 'b'].map((id) => participant(id));
    const groups = [{ key: 'A', participantIds: ['a', 'b'] }];
    const matches: CompetitionMatch[] = [
      { id: 'm1', competitionId: 'c1', stage: 'group', groupKey: 'A', homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 2, awayScore: 0, status: 'finished' },
    ];
    useCompetitionStore.setState({ competition: { ...competition, status: 'group_stage', groups }, participants, matches });

    await useCompetitionStore.getState().startKnockout('c1');

    expect(storage.saveCompetition).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'knockout', bracket: expect.objectContaining({ rounds: expect.any(Array) }) }),
    );
  });

  it('resolveTie final menyimpan champion + bracket dengan winner terisi (regresi R-001)', async () => {
    const participants = ['a', 'b'].map((id) => participant(id));
    const matches: CompetitionMatch[] = [
      { id: 'm1', competitionId: 'c1', stage: 'knockout', round: 0, tieIndex: 0, leg: 1, homeParticipantId: 'a', awayParticipantId: 'b', homeScore: 2, awayScore: 0, status: 'finished' },
    ];
    const bracket = { rounds: [[{ team1: 'a', team2: 'b', matchIds: ['m1'] }]] };
    useCompetitionStore.setState({ competition: { ...competition, status: 'knockout', bracket }, participants, matches });

    await useCompetitionStore.getState().resolveTie('c1', 0, 0);

    expect(storage.saveCompetition).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(storage.saveCompetition).mock.calls[0][0] as Competition;
    expect(saved.status).toBe('finished');
    expect(saved.championId).toBe('a');
    expect(saved.bracket?.rounds[0][0].winner).toBe('a');
  });
});
