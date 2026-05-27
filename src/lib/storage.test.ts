import { beforeEach, describe, expect, it } from 'vitest';
import {
  KEYS,
  byCreatedAtDesc,
  cascadeDeleteLeague,
  createId,
  getAll,
  getById,
  getCache,
  getSettings,
  remove,
  save,
  saveCache,
  saveSettings,
  setAll,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('getAll', () => {
  it('returns empty array when nothing stored', () => {
    expect(getAll('test_key')).toEqual([]);
  });

  it('returns stored items', () => {
    localStorage.setItem('test_key', JSON.stringify([{ id: '1', name: 'Alice' }]));
    expect(getAll('test_key')).toEqual([{ id: '1', name: 'Alice' }]);
  });
});

describe('setAll', () => {
  it('persists items to localStorage', () => {
    setAll('test_key', [{ id: '1' }, { id: '2' }]);
    expect(JSON.parse(localStorage.getItem('test_key')!)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('overwrites existing data', () => {
    setAll('test_key', [{ id: '1' }]);
    setAll('test_key', [{ id: '2' }]);
    expect(getAll('test_key')).toEqual([{ id: '2' }]);
  });
});

describe('getById', () => {
  it('returns item by id', () => {
    setAll('test_key', [{ id: 'abc' }, { id: 'xyz' }]);
    expect(getById('test_key', 'abc')).toEqual({ id: 'abc' });
  });

  it('returns null when id not found', () => {
    expect(getById('test_key', 'missing')).toBeNull();
  });

  it('returns null when id is null', () => {
    expect(getById('test_key', null)).toBeNull();
  });

  it('returns null when id is undefined', () => {
    expect(getById('test_key', undefined)).toBeNull();
  });
});

describe('createId', () => {
  it('returns a non-empty string', () => {
    const id = createId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, createId));
    expect(ids.size).toBe(50);
  });
});

describe('save', () => {
  it('creates a new item with a generated id', () => {
    const saved = save('test_key', { name: 'Alice' });
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Alice');
    expect(getAll('test_key')).toHaveLength(1);
  });

  it('preserves a provided id', () => {
    const saved = save('test_key', { id: 'fixed-id', name: 'Bob' });
    expect(saved.id).toBe('fixed-id');
  });

  it('updates an existing item by id', () => {
    save('test_key', { id: 'fixed-id', name: 'Old' });
    save('test_key', { id: 'fixed-id', name: 'New' });
    const all = getAll<{ id: string; name: string }>('test_key');
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('New');
  });

  it('appends when ids differ', () => {
    save('test_key', { id: 'id1', name: 'A' });
    save('test_key', { id: 'id2', name: 'B' });
    expect(getAll('test_key')).toHaveLength(2);
  });
});

describe('remove', () => {
  it('removes an item by id', () => {
    save('test_key', { id: 'to-remove', name: 'X' });
    save('test_key', { id: 'keep', name: 'Y' });
    remove('test_key', 'to-remove');
    const all = getAll<{ id: string }>('test_key');
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('keep');
  });

  it('does nothing when id is not found', () => {
    save('test_key', { id: 'keep', name: 'Y' });
    remove('test_key', 'missing');
    expect(getAll('test_key')).toHaveLength(1);
  });
});

describe('getSettings', () => {
  it('returns default settings when nothing stored', () => {
    expect(getSettings()).toEqual({ apiKey: '' });
  });

  it('returns stored settings', () => {
    localStorage.setItem(KEYS.settings, JSON.stringify({ apiKey: 'mykey' }));
    expect(getSettings()).toEqual({ apiKey: 'mykey' });
  });
});

describe('saveSettings', () => {
  it('saves and returns settings', () => {
    const result = saveSettings({ apiKey: 'abc123' });
    expect(result.apiKey).toBe('abc123');
    expect(getSettings().apiKey).toBe('abc123');
  });

  it('merges partial updates into existing settings', () => {
    saveSettings({ apiKey: 'initial' });
    saveSettings({ apiKey: 'updated' });
    expect(getSettings().apiKey).toBe('updated');
  });
});

describe('getCache', () => {
  it('returns empty object when nothing stored', () => {
    expect(getCache()).toEqual({});
  });

  it('returns stored cache', () => {
    const cache = { q1: { data: [], fetchedAt: '2024-01-01' } };
    localStorage.setItem(KEYS.clubsCache, JSON.stringify(cache));
    expect(getCache()).toEqual(cache);
  });
});

describe('saveCache', () => {
  it('saves and returns the cache', () => {
    const cache = { q1: { data: ['club'], fetchedAt: '2024-01-01' } };
    const result = saveCache(cache);
    expect(result).toEqual(cache);
    expect(getCache()).toEqual(cache);
  });
});

describe('cascadeDeleteLeague', () => {
  it('removes the league and all related teams, seasons, and matches', () => {
    save(KEYS.leagues, { id: 'league1', name: 'L1' });
    save(KEYS.leagues, { id: 'league2', name: 'L2' });
    save(KEYS.teams, { id: 'team1', leagueId: 'league1' });
    save(KEYS.teams, { id: 'team2', leagueId: 'league2' });
    save(KEYS.seasons, { id: 'season1', leagueId: 'league1' });
    save(KEYS.seasons, { id: 'season2', leagueId: 'league2' });
    save(KEYS.matches, { id: 'match1', seasonId: 'season1' });
    save(KEYS.matches, { id: 'match2', seasonId: 'season2' });

    cascadeDeleteLeague('league1');

    expect(getAll(KEYS.leagues)).toHaveLength(1);
    expect(getById(KEYS.leagues, 'league2')).not.toBeNull();
    expect(getAll(KEYS.teams)).toHaveLength(1);
    expect(getById(KEYS.teams, 'team2')).not.toBeNull();
    expect(getAll(KEYS.seasons)).toHaveLength(1);
    expect(getAll(KEYS.matches)).toHaveLength(1);
    expect(getById(KEYS.matches, 'match2')).not.toBeNull();
  });

  it('removes matches from all seasons of the deleted league', () => {
    save(KEYS.leagues, { id: 'lg', name: 'L' });
    save(KEYS.seasons, { id: 's1', leagueId: 'lg' });
    save(KEYS.seasons, { id: 's2', leagueId: 'lg' });
    save(KEYS.matches, { id: 'm1', seasonId: 's1' });
    save(KEYS.matches, { id: 'm2', seasonId: 's2' });

    cascadeDeleteLeague('lg');

    expect(getAll(KEYS.matches)).toHaveLength(0);
  });
});

describe('byCreatedAtDesc', () => {
  it('sorts newer items before older items', () => {
    const older = { createdAt: '2024-01-01T00:00:00Z' };
    const newer = { createdAt: '2024-06-01T00:00:00Z' };
    expect(byCreatedAtDesc(older, newer)).toBeGreaterThan(0);
    expect(byCreatedAtDesc(newer, older)).toBeLessThan(0);
  });

  it('returns 0 for identical timestamps', () => {
    const item = { createdAt: '2024-01-01T00:00:00Z' };
    expect(byCreatedAtDesc(item, item)).toBe(0);
  });
});
