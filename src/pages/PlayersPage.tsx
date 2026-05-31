import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { calculatePlayerStatsFromData } from '../lib/playerStats';
import { useAuthStore } from '../store/useAuthStore';
import { useMatchStore } from '../store/useMatchStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';

export function PlayersPage() {
  const players = usePlayerStore((state) => state.players);
  const addPlayer = usePlayerStore((state) => state.addPlayer);
  const updatePlayer = usePlayerStore((state) => state.updatePlayer);
  const deletePlayer = usePlayerStore((state) => state.deletePlayer);
  const fetchPlayers = usePlayerStore((state) => state.fetchPlayers);
  const teams = useTeamStore((state) => state.teams);
  const fetchTeams = useTeamStore((state) => state.fetchTeams);
  const seasons = useSeasonStore((state) => state.seasons);
  const fetchSeasons = useSeasonStore((state) => state.fetchSeasons);
  const matches = useMatchStore((state) => state.matches);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
    fetchSeasons();
    fetchMatches();
  }, [fetchPlayers, fetchTeams, fetchSeasons, fetchMatches]);

  const leaderboard = useMemo(
    () =>
      players
        .map((player) => ({ player, stats: calculatePlayerStatsFromData(player.id, teams, seasons, matches).totals }))
        .sort((a, b) => b.stats.points - a.stats.points || b.stats.gd - a.stats.gd),
    [players, teams, seasons, matches],
  );

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setNewName('');
    setAddError('');
  }

  async function handleAddPlayer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    if (players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Nama sudah dipakai');
      return;
    }

    await addPlayer({ name, createdAt: new Date().toISOString() });
    closeAddForm();
  }

  async function commitEdit(player: (typeof players)[number]) {
    const name = editName.trim();
    if (name && name !== player.name) await updatePlayer({ ...player, name });
    setEditingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus player "${name}"? Statistiknya akan hilang dan tim yang dimilikinya menjadi tanpa owner.`)) return;
    await deletePlayer(id);
    await fetchTeams();
  }

  return (
    <Shell active="players" title="Players">
      <div className="panel">
        <div className="panel-head">
          <h2>Global Leaderboard</h2>
          {isAdmin ? (
            showAddForm ? (
              <form
                onSubmit={handleAddPlayer}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) closeAddForm();
                }}
                style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}
              >
                <input
                  value={newName}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    setAddError('');
                  }}
                  placeholder="Nama player"
                  autoFocus
                  required
                  style={{ width: 180 }}
                />
                {addError ? (
                  <span className="muted" style={{ color: 'var(--danger)' }}>
                    {addError}
                  </span>
                ) : null}
                <button className="btn btn-xs" type="submit">
                  Simpan
                </button>
                <button className="btn btn-xs" type="button" onClick={closeAddForm}>
                  Cancel
                </button>
              </form>
            ) : (
              <button className="btn btn-xs" type="button" onClick={() => setShowAddForm(true)}>
                + Add
              </button>
            )
          ) : null}
        </div>
        <div className="panel-body">
          {leaderboard.length === 0 ? (
            <div className="empty">Belum ada player. Tambah player lewat tombol + Add.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>M</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>Pts</th>
                  <th>Champ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(({ player, stats }, index) => (
                  <tr key={player.id}>
                    <td className="muted">{index + 1}</td>
                    <td>
                      {isAdmin && editingId === player.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            commitEdit(player);
                          }}
                          style={{ display: 'inline' }}
                        >
                          <input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            onBlur={() => commitEdit(player)}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            style={{ width: 120 }}
                          />
                        </form>
                      ) : (
                        <span onClick={() => isAdmin ? startEdit(player.id, player.name) : undefined} style={{ cursor: isAdmin ? 'pointer' : undefined }} title={isAdmin ? 'Klik untuk edit nama' : undefined}>
                          <Link to={`/player/${player.id}`} onClick={(event) => event.stopPropagation()}>
                            {player.name}
                          </Link>{' '}
                          {isAdmin ? (
                            <span className="muted" style={{ fontSize: '0.8em' }}>
                              edit
                            </span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td>{stats.played}</td>
                    <td>{stats.won}</td>
                    <td>{stats.drawn}</td>
                    <td>{stats.lost}</td>
                    <td>{stats.gf}</td>
                    <td>{stats.ga}</td>
                    <td>{stats.gd >= 0 ? `+${stats.gd}` : stats.gd}</td>
                    <td>
                      <strong>{stats.points}</strong>
                    </td>
                    <td>{stats.championships || ''}</td>
                    <td>
                      {isAdmin ? (
                        <button className="btn btn-xs danger" type="button" onClick={() => handleDelete(player.id, player.name)}>
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}
