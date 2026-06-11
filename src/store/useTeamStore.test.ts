import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import type { Team } from '../lib/types';
import { useTeamStore } from './useTeamStore';

vi.mock('../lib/storage');

const team: Team = { id: 't1', leagueId: 'l1', name: 'FC Test', status: 'active', ownerId: 'p1', owner: 'Alice' };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(storage.getTeams).mockResolvedValue([]);
  vi.mocked(storage.getMatchesByTeamId).mockResolvedValue([]);
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

  it('removes multiple teams and refreshes once', async () => {
    const teams: Team[] = [
      { id: 't1', leagueId: 'l1', name: 'A', status: 'pool' },
      { id: 't2', leagueId: 'l1', name: 'B', status: 'pool' },
      { id: 't3', leagueId: 'l1', name: 'C', status: 'active', ownerId: 'p1' },
    ];
    useTeamStore.setState({ teams });
    vi.mocked(storage.deleteTeam).mockResolvedValue(undefined);
    vi.mocked(storage.getTeams).mockResolvedValue([teams[2]]);

    await useTeamStore.getState().removeTeams(['t1', 't2']);

    expect(storage.deleteTeam).toHaveBeenCalledTimes(2);
    expect(storage.deleteTeam).toHaveBeenCalledWith('t1');
    expect(storage.deleteTeam).toHaveBeenCalledWith('t2');
    expect(useTeamStore.getState().teams).toEqual([teams[2]]);
  });

  it('does not delete a team that has match history', async () => {
    useTeamStore.setState({ teams: [team] });
    vi.mocked(storage.getMatchesByTeamId).mockResolvedValue([{ id: 'm1' } as never]);

    const removed = await useTeamStore.getState().removeTeam('t1');

    expect(removed).toBe(false);
    expect(storage.deleteTeam).not.toHaveBeenCalled();
  });

  it('removeTeams skips teams with match history and returns blocked ids', async () => {
    const teams: Team[] = [
      { id: 't1', leagueId: 'l1', name: 'A', status: 'pool' },
      { id: 't2', leagueId: 'l1', name: 'B', status: 'pool' },
    ];
    useTeamStore.setState({ teams });
    vi.mocked(storage.getMatchesByTeamId).mockImplementation(async (id) =>
      id === 't1' ? [{ id: 'm1' } as never] : [],
    );

    const blocked = await useTeamStore.getState().removeTeams(['t1', 't2']);

    expect(blocked).toEqual(['t1']);
    expect(storage.deleteTeam).toHaveBeenCalledTimes(1);
    expect(storage.deleteTeam).toHaveBeenCalledWith('t2');
  });

  it('removeTeams handles empty array gracefully', async () => {
    await useTeamStore.getState().removeTeams([]);

    expect(storage.deleteTeam).not.toHaveBeenCalled();
    expect(storage.getTeams).toHaveBeenCalledOnce();
  });

  it('marks a pool team as ready', async () => {
    const poolTeam: Team = { id: 't1', leagueId: 'l1', name: 'FC Test', status: 'pool' };
    useTeamStore.setState({ teams: [poolTeam] });
    vi.mocked(storage.saveTeam).mockResolvedValue({ ...poolTeam, status: 'ready' });
    vi.mocked(storage.getTeams).mockResolvedValue([{ ...poolTeam, status: 'ready' }]);

    await useTeamStore.getState().markReady('t1');

    expect(storage.saveTeam).toHaveBeenCalledWith({ ...poolTeam, status: 'ready' });
    expect(useTeamStore.getState().teams[0].status).toBe('ready');
  });

  it('marks a ready team back to pool', async () => {
    const readyTeam: Team = { id: 't1', leagueId: 'l1', name: 'FC Test', status: 'ready' };
    useTeamStore.setState({ teams: [readyTeam] });
    vi.mocked(storage.saveTeam).mockResolvedValue({ ...readyTeam, status: 'pool' });
    vi.mocked(storage.getTeams).mockResolvedValue([{ ...readyTeam, status: 'pool' }]);

    await useTeamStore.getState().markPool('t1');

    expect(storage.saveTeam).toHaveBeenCalledWith({ ...readyTeam, status: 'pool' });
    expect(useTeamStore.getState().teams[0].status).toBe('pool');
  });

  it('markReady is a no-op if team is not found', async () => {
    useTeamStore.setState({ teams: [] });

    await useTeamStore.getState().markReady('nonexistent');

    expect(storage.saveTeam).not.toHaveBeenCalled();
  });
});
