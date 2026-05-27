import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, getAll, getById, save } from '../lib/storage';
import { useMatchStore } from './useMatchStore';

beforeEach(() => {
  localStorage.clear();
  useMatchStore.setState({ matches: [] });
});

function seedMatch(overrides = {}) {
  return save(KEYS.matches, {
    id: 'match1',
    seasonId: 'season1',
    matchday: 1,
    homeTeamId: 't1',
    awayTeamId: 't2',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    ...overrides,
  });
}

describe('useMatchStore.updateMatch', () => {
  it('persists a match update to localStorage', () => {
    const match = seedMatch();
    useMatchStore.setState({ matches: [match as never] });

    const { updateMatch } = useMatchStore.getState();
    updateMatch({ ...match, homeScore: 2, awayScore: 1, status: 'finished' } as never);

    const stored = getById<{ id: string; homeScore: number; status: string }>(KEYS.matches, match.id);
    expect(stored?.homeScore).toBe(2);
    expect(stored?.status).toBe('finished');
  });

  it('reflects the update in store state', () => {
    const match = seedMatch();
    useMatchStore.setState({ matches: [match as never] });

    const { updateMatch } = useMatchStore.getState();
    updateMatch({ ...match, homeScore: 3, awayScore: 0, status: 'finished' } as never);

    const storeMatch = useMatchStore.getState().matches.find((m) => m.id === match.id);
    expect(storeMatch?.homeScore).toBe(3);
  });

  it('does not create a duplicate when updating', () => {
    const match = seedMatch();
    useMatchStore.setState({ matches: [match as never] });

    const { updateMatch } = useMatchStore.getState();
    updateMatch({ ...match, homeScore: 1, awayScore: 1, status: 'finished' } as never);

    expect(getAll(KEYS.matches)).toHaveLength(1);
  });
});

describe('useMatchStore.refresh', () => {
  it('re-syncs state from localStorage', () => {
    seedMatch();
    useMatchStore.setState({ matches: [] });
    expect(useMatchStore.getState().matches).toHaveLength(0);

    useMatchStore.getState().refresh();
    expect(useMatchStore.getState().matches).toHaveLength(1);
  });
});
