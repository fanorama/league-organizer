import { describe, expect, it } from 'vitest';
import type { Match, Team } from './types';
import {
  formatGoalDiff,
  getInitials,
  getTeamColor,
  latestMatchday,
  proxiedLogoUrl,
  teamLogoUrl,
} from './standingsImage';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return { id: 't1', leagueId: 'l1', name: 'Arsenal FC', status: 'active', ...overrides };
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return { id: 'm1', seasonId: 's1', matchday: 1, homeTeamId: 'a', awayTeamId: 'b', status: 'finished', ...overrides };
}

describe('teamLogoUrl', () => {
  it('mengembalikan URL dari badge bila berupa http(s)', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'https://crests.football-data.org/57.png' }))).toBe('https://crests.football-data.org/57.png');
  });
  it('jatuh ke logo bila badge bukan URL', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'ARS', logo: 'https://x/y.png' }))).toBe('https://x/y.png');
  });
  it('menormalisasi logo API-Sports dari externalId agar tidak memakai URL logo yang salah', () => {
    expect(teamLogoUrl(makeTeam({
      externalId: '541',
      badge: 'https://media.api-sports.io/football/teams/42.png',
    }))).toBe('https://media.api-sports.io/football/teams/541.png');
  });
  it('tidak menormalisasi host lain dari externalId', () => {
    expect(teamLogoUrl(makeTeam({
      externalId: '57',
      badge: 'https://crests.football-data.org/57.png',
    }))).toBe('https://crests.football-data.org/57.png');
  });
  it('mengembalikan null bila tak ada URL', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'ARS' }))).toBeNull();
  });
});

describe('proxiedLogoUrl', () => {
  it('membungkus url ke endpoint /api/crest dengan encoding', () => {
    expect(proxiedLogoUrl('https://crests.football-data.org/57.svg')).toBe('/api/crest?url=https%3A%2F%2Fcrests.football-data.org%2F57.svg');
  });
});

describe('getInitials', () => {
  it('memakai inisial dua kata pertama', () => {
    expect(getInitials(makeTeam({ name: 'Aston Villa' }))).toBe('AV');
  });
  it('memakai dua huruf pertama untuk satu kata', () => {
    expect(getInitials(makeTeam({ shortName: 'ARS', name: 'Arsenal' }))).toBe('AR');
  });
});

describe('getTeamColor', () => {
  it('deterministik untuk tim yang sama', () => {
    const team = makeTeam();
    expect(getTeamColor(team)).toBe(getTeamColor(team));
  });
  it('mengembalikan warna hex dari palet', () => {
    expect(getTeamColor(makeTeam())).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('formatGoalDiff', () => {
  it('memberi tanda + untuk positif', () => expect(formatGoalDiff(22)).toBe('+22'));
  it('apa adanya untuk nol', () => expect(formatGoalDiff(0)).toBe('0'));
  it('apa adanya untuk negatif', () => expect(formatGoalDiff(-9)).toBe('-9'));
});

describe('latestMatchday', () => {
  it('mengambil matchday tertinggi dari match liga yang selesai', () => {
    const matches = [
      makeMatch({ matchday: 1 }),
      makeMatch({ id: 'm2', matchday: 5 }),
      makeMatch({ id: 'm3', matchday: 9, status: 'scheduled' }),
      makeMatch({ id: 'm4', matchday: 12, matchType: 'playoff' }),
    ];
    expect(latestMatchday(matches, 's1')).toBe(5);
  });
  it('mengembalikan null bila belum ada yang selesai', () => {
    expect(latestMatchday([makeMatch({ status: 'scheduled' })], 's1')).toBeNull();
  });
});
