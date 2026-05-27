import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, getAll, getById, save } from '../lib/storage';
import { useSeasonStore } from './useSeasonStore';
import { useLeagueStore } from './useLeagueStore';

beforeEach(() => {
  localStorage.clear();
  useSeasonStore.setState({ seasons: [] });
  useLeagueStore.setState({ leagues: [] });
});

function makeLeague() {
  return save(KEYS.leagues, {
    id: 'lg1',
    name: 'Test League',
    createdAt: new Date().toISOString(),
    settings: { meetingsPerSeason: 1, continuousSeasons: false },
  });
}

function makeTeam(id: string) {
  return save(KEYS.teams, {
    id,
    leagueId: 'lg1',
    name: `Team ${id}`,
    owner: `Player ${id}`,
    ownerId: `p${id}`,
    status: 'active',
    createdAt: new Date().toISOString(),
  });
}

function makePlayer(id: string, name: string) {
  return save(KEYS.players, {
    id,
    name,
    createdAt: new Date().toISOString(),
  });
}

describe('useSeasonStore.createSeason', () => {
  it('creates a season and persists it', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason } = useSeasonStore.getState();
    const season = createSeason(league, [t1, t2]);

    expect(season.id).toBeDefined();
    expect(season.leagueId).toBe('lg1');
    expect(getAll(KEYS.seasons)).toHaveLength(1);
  });

  it('generates a schedule of matches for the teams', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason } = useSeasonStore.getState();
    createSeason(league, [t1, t2]);

    // 2 teams, 1 meeting → 1 match
    expect(getAll(KEYS.matches)).toHaveLength(1);
  });

  it('updates store state after creation', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;

    const { createSeason } = useSeasonStore.getState();
    createSeason(league, [t1]);

    expect(useSeasonStore.getState().seasons).toHaveLength(1);
  });

  it('increments season number for a league', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason } = useSeasonStore.getState();
    createSeason(league, [t1, t2]);
    const second = createSeason(league, [t1, t2]);

    expect(second.number).toBe(2);
  });

  it('snapshots owner names at season creation', () => {
    const league = makeLeague() as never;
    makePlayer('pt1', 'Alice');
    makePlayer('pt2', 'Bob');
    const t1 = { ...(makeTeam('t1') as object), owner: 'Old Alice', ownerId: 'pt1' } as never;
    const t2 = { ...(makeTeam('t2') as object), owner: 'Old Bob', ownerId: 'pt2' } as never;

    const { createSeason } = useSeasonStore.getState();
    const season = createSeason(league, [t1, t2]);

    expect(season.ownerSnapshots?.t1).toEqual({ playerId: 'pt1', playerName: 'Alice' });
    expect(season.ownerSnapshots?.t2).toEqual({ playerId: 'pt2', playerName: 'Bob' });
  });
});

describe('useSeasonStore.updateSeason', () => {
  it('updates a season and persists the change', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason, updateSeason } = useSeasonStore.getState();
    const season = createSeason(league, [t1, t2]);
    const updated = updateSeason({ ...season, status: 'finished', champion: 't1' });

    expect(updated.status).toBe('finished');
    expect(updated.champion).toBe('t1');
    expect(getById(KEYS.seasons, season.id)?.status).toBe('finished');
  });

  it('reflects the update in store state', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason, updateSeason } = useSeasonStore.getState();
    const season = createSeason(league, [t1, t2]);
    updateSeason({ ...season, status: 'active' });

    expect(useSeasonStore.getState().seasons[0].status).toBe('active');
  });
});

describe('useSeasonStore.refresh', () => {
  it('re-syncs state from localStorage', () => {
    const league = makeLeague() as never;
    const t1 = makeTeam('t1') as never;
    const t2 = makeTeam('t2') as never;

    const { createSeason, refresh } = useSeasonStore.getState();
    createSeason(league, [t1, t2]);

    useSeasonStore.setState({ seasons: [] });
    expect(useSeasonStore.getState().seasons).toHaveLength(0);

    refresh();
    expect(useSeasonStore.getState().seasons).toHaveLength(1);
  });
});
