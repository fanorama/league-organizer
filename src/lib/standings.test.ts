import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, save } from './storage';
import { calculateStandings } from './standings';

beforeEach(() => {
  localStorage.clear();
});

function makeLeague(id = 'league1') {
  return save(KEYS.leagues, {
    id,
    name: 'Test League',
    createdAt: new Date().toISOString(),
    settings: { meetingsPerSeason: 1, continuousSeasons: false },
  });
}

function makeTeam(id: string, leagueId: string) {
  return save(KEYS.teams, { id, leagueId, name: `Team ${id}`, status: 'active', createdAt: new Date().toISOString() });
}

function makeSeason(id: string, leagueId: string, teamIds: string[]) {
  return save(KEYS.seasons, {
    id,
    leagueId,
    number: 1,
    status: 'active',
    teamIds,
    createdAt: new Date().toISOString(),
  });
}

function makeMatch(
  id: string,
  seasonId: string,
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number,
  status = 'finished',
  matchType?: string,
) {
  return save(KEYS.matches, {
    id,
    seasonId,
    matchday: 1,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    status,
    ...(matchType ? { matchType } : {}),
  });
}

describe('calculateStandings', () => {
  it('returns empty array when season is not found', () => {
    expect(calculateStandings('nonexistent')).toEqual([]);
  });

  it('returns a row for every team in the season', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeTeam('t3', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2', 't3']);

    const standings = calculateStandings('s1');
    expect(standings).toHaveLength(3);
  });

  it('calculates a win correctly', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 3, 1);

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.won).toBe(1);
    expect(t1.drawn).toBe(0);
    expect(t1.lost).toBe(0);
    expect(t1.pts).toBe(3);
    expect(t1.gf).toBe(3);
    expect(t1.ga).toBe(1);
    expect(t1.gd).toBe(2);
  });

  it('calculates a draw correctly for both teams', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 1, 1);

    const standings = calculateStandings('s1');
    for (const row of standings) {
      expect(row.drawn).toBe(1);
      expect(row.pts).toBe(1);
    }
  });

  it('calculates a loss correctly for the away team', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 2, 0);

    const standings = calculateStandings('s1');
    const t2 = standings.find((r) => r.team.id === 't2')!;
    expect(t2.lost).toBe(1);
    expect(t2.pts).toBe(0);
    expect(t2.gf).toBe(0);
    expect(t2.ga).toBe(2);
    expect(t2.gd).toBe(-2);
  });

  it('ignores playoff matches', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 5, 0, 'finished', 'playoff');

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.played).toBe(0);
    expect(t1.pts).toBe(0);
  });

  it('ignores scheduled and delayed matches', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 3, 0, 'scheduled');
    makeMatch('m2', 's1', 't1', 't2', 3, 0, 'delayed');

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.played).toBe(0);
  });

  it('sorts by points descending', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't2', 't1', 2, 0);

    const standings = calculateStandings('s1');
    expect(standings[0].team.id).toBe('t2');
    expect(standings[1].team.id).toBe('t1');
  });

  it('breaks points tie by goal difference', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeTeam('t3', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2', 't3']);
    // t1: 3pts, gd +2
    makeMatch('m1', 's1', 't1', 't2', 3, 1);
    // t3: 3pts, gd +1
    makeMatch('m2', 's1', 't3', 't2', 2, 1);

    const standings = calculateStandings('s1');
    expect(standings[0].team.id).toBe('t1');
    expect(standings[1].team.id).toBe('t3');
  });

  it('tracks form up to the last 5 results', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    for (let i = 0; i < 6; i++) {
      makeMatch(`m${i}`, 's1', 't1', 't2', 1, 0);
    }

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.form).toHaveLength(5);
    expect(t1.form.every((r) => r === 'W')).toBe(true);
  });

  it('records correct form entries: W, D, L', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 1, 0); // W
    makeMatch('m2', 's1', 't1', 't2', 0, 0); // D
    makeMatch('m3', 's1', 't2', 't1', 2, 0); // L

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.form).toContain('W');
    expect(t1.form).toContain('D');
    expect(t1.form).toContain('L');
  });

  it('counts played matches correctly across multiple rounds', () => {
    makeLeague();
    makeTeam('t1', 'league1');
    makeTeam('t2', 'league1');
    makeSeason('s1', 'league1', ['t1', 't2']);
    makeMatch('m1', 's1', 't1', 't2', 1, 0);
    makeMatch('m2', 's1', 't2', 't1', 0, 1);

    const standings = calculateStandings('s1');
    const t1 = standings.find((r) => r.team.id === 't1')!;
    expect(t1.played).toBe(2);
    expect(t1.won).toBe(2);
    expect(t1.pts).toBe(6);
  });
});
