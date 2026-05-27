import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, getAll, getById, save } from '../lib/storage';
import { useLeagueStore } from './useLeagueStore';

beforeEach(() => {
  localStorage.clear();
  useLeagueStore.setState({ leagues: [] });
});

const baseLeagueData = () => ({
  name: 'Test League',
  createdAt: new Date().toISOString(),
  settings: { meetingsPerSeason: 1, continuousSeasons: false },
});

describe('useLeagueStore.createLeague', () => {
  it('creates a league and persists it to localStorage', () => {
    const { createLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());

    expect(league.id).toBeDefined();
    expect(league.name).toBe('Test League');
    expect(getAll(KEYS.leagues)).toHaveLength(1);
  });

  it('updates store state after creation', () => {
    const { createLeague } = useLeagueStore.getState();
    createLeague(baseLeagueData());

    expect(useLeagueStore.getState().leagues).toHaveLength(1);
  });
});

describe('useLeagueStore.updateLeague', () => {
  it('updates an existing league', () => {
    const { createLeague, updateLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());
    const updated = updateLeague({ ...league, name: 'Updated Name' });

    expect(updated.name).toBe('Updated Name');
    expect(getAll(KEYS.leagues)).toHaveLength(1);
    expect(getById(KEYS.leagues, league.id)?.name).toBe('Updated Name');
  });

  it('reflects the update in store state', () => {
    const { createLeague, updateLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());
    updateLeague({ ...league, name: 'Changed' });

    expect(useLeagueStore.getState().leagues[0].name).toBe('Changed');
  });
});

describe('useLeagueStore.deleteLeague', () => {
  it('removes a league from localStorage', () => {
    const { createLeague, deleteLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());
    deleteLeague(league.id);

    expect(getAll(KEYS.leagues)).toHaveLength(0);
  });

  it('updates store state after deletion', () => {
    const { createLeague, deleteLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());
    deleteLeague(league.id);

    expect(useLeagueStore.getState().leagues).toHaveLength(0);
  });

  it('cascades deletion to related teams and seasons', () => {
    const { createLeague, deleteLeague } = useLeagueStore.getState();
    const league = createLeague(baseLeagueData());
    save(KEYS.teams, { id: 't1', leagueId: league.id });
    save(KEYS.seasons, { id: 's1', leagueId: league.id });

    deleteLeague(league.id);

    expect(getAll(KEYS.teams)).toHaveLength(0);
    expect(getAll(KEYS.seasons)).toHaveLength(0);
  });
});

describe('useLeagueStore.refresh', () => {
  it('re-syncs state from localStorage', () => {
    const { createLeague, refresh } = useLeagueStore.getState();
    createLeague(baseLeagueData());

    useLeagueStore.setState({ leagues: [] });
    expect(useLeagueStore.getState().leagues).toHaveLength(0);

    refresh();
    expect(useLeagueStore.getState().leagues).toHaveLength(1);
  });
});
