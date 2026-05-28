import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { Team } from '../lib/types';
import { useTeamStore } from './useTeamStore';

vi.mock('../lib/storage');

const team: Team = { id: 't1', leagueId: 'l1', name: 'FC Test', status: 'active', ownerId: 'p1', owner: 'Alice' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getTeams).mockResolvedValue([]);
  useTeamStore.setState({ teams: [] });
});

describe('useTeamStore', () => {
  it('adds a team and refreshes state', async () => {
    vi.mocked(storage.saveTeam).mockResolvedValue(team);
    vi.mocked(storage.getTeams).mockResolvedValue([team]);

    const saved = await useTeamStore.getState().addTeam({ leagueId: 'l1', name: 'FC Test', status: 'active' });

    expect(saved).toEqual(team);
    expect(useTeamStore.getState().teams).toEqual([team]);
  });

  it('removes a team and refreshes state', async () => {
    await useTeamStore.getState().removeTeam('t1');

    expect(storage.deleteTeam).toHaveBeenCalledWith('t1');
    expect(useTeamStore.getState().teams).toEqual([]);
  });

  it('unassigns a team', async () => {
    useTeamStore.setState({ teams: [team] });
    vi.mocked(storage.getTeams).mockResolvedValue([{ ...team, status: 'pool', ownerId: null, owner: null }]);

    await useTeamStore.getState().unassignTeam('t1');

    expect(storage.saveTeam).toHaveBeenCalledWith({ ...team, status: 'pool', owner: null, ownerId: null });
    expect(useTeamStore.getState().teams[0].status).toBe('pool');
  });
});
