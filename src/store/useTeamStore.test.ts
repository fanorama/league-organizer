import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, getAll, getById } from '../lib/storage';
import { useTeamStore } from './useTeamStore';

beforeEach(() => {
  localStorage.clear();
  useTeamStore.setState({ teams: [] });
});

const baseTeam = () => ({
  leagueId: 'league1',
  name: 'FC Test',
  status: 'active' as const,
  createdAt: new Date().toISOString(),
});

describe('useTeamStore.addTeam', () => {
  it('creates a team and persists it to localStorage', () => {
    const { addTeam } = useTeamStore.getState();
    const team = addTeam(baseTeam());

    expect(team.id).toBeDefined();
    expect(team.name).toBe('FC Test');
    expect(getAll(KEYS.teams)).toHaveLength(1);
  });

  it('updates store state after adding', () => {
    const { addTeam } = useTeamStore.getState();
    addTeam(baseTeam());

    expect(useTeamStore.getState().teams).toHaveLength(1);
  });
});

describe('useTeamStore.updateTeam', () => {
  it('updates a team and persists the change', () => {
    const { addTeam, updateTeam } = useTeamStore.getState();
    const team = addTeam(baseTeam());
    const updated = updateTeam({ ...team, name: 'FC Updated' });

    expect(updated.name).toBe('FC Updated');
    expect(getAll(KEYS.teams)).toHaveLength(1);
    expect(getById(KEYS.teams, team.id)?.name).toBe('FC Updated');
  });

  it('reflects the update in store state', () => {
    const { addTeam, updateTeam } = useTeamStore.getState();
    const team = addTeam(baseTeam());
    updateTeam({ ...team, name: 'Changed' });

    expect(useTeamStore.getState().teams[0].name).toBe('Changed');
  });
});

describe('useTeamStore.removeTeam', () => {
  it('removes a team from localStorage', () => {
    const { addTeam, removeTeam } = useTeamStore.getState();
    const team = addTeam(baseTeam());
    removeTeam(team.id);

    expect(getAll(KEYS.teams)).toHaveLength(0);
  });

  it('updates store state after removal', () => {
    const { addTeam, removeTeam } = useTeamStore.getState();
    const team = addTeam(baseTeam());
    removeTeam(team.id);

    expect(useTeamStore.getState().teams).toHaveLength(0);
  });

  it('only removes the targeted team', () => {
    const { addTeam, removeTeam } = useTeamStore.getState();
    const t1 = addTeam({ ...baseTeam(), name: 'Keep' });
    const t2 = addTeam({ ...baseTeam(), name: 'Remove' });
    removeTeam(t2.id);

    const remaining = getAll<{ id: string }>(KEYS.teams);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(t1.id);
  });
});

describe('useTeamStore.unassignTeam', () => {
  it('sets status to pool and clears owner', () => {
    const { addTeam, unassignTeam } = useTeamStore.getState();
    const team = addTeam({ ...baseTeam(), status: 'active', owner: 'player1' });
    unassignTeam(team.id);

    const stored = getById<{ id: string; status: string; owner: string | null }>(KEYS.teams, team.id);
    expect(stored?.status).toBe('pool');
    expect(stored?.owner).toBeNull();
  });

  it('does nothing when team id is not found', () => {
    const { unassignTeam } = useTeamStore.getState();
    expect(() => unassignTeam('nonexistent')).not.toThrow();
  });

  it('reflects the change in store state', () => {
    const { addTeam, unassignTeam } = useTeamStore.getState();
    const team = addTeam({ ...baseTeam(), status: 'active', owner: 'p1' });
    unassignTeam(team.id);

    const storeTeam = useTeamStore.getState().teams.find((t) => t.id === team.id);
    expect(storeTeam?.status).toBe('pool');
    expect(storeTeam?.owner).toBeNull();
  });
});

describe('useTeamStore.refresh', () => {
  it('re-syncs state from localStorage', () => {
    const { addTeam, refresh } = useTeamStore.getState();
    addTeam(baseTeam());

    useTeamStore.setState({ teams: [] });
    expect(useTeamStore.getState().teams).toHaveLength(0);

    refresh();
    expect(useTeamStore.getState().teams).toHaveLength(1);
  });
});
