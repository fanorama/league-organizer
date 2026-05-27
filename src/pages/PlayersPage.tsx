import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { calculatePlayerStats } from '../lib/playerStats';
import { usePlayerStore } from '../store/usePlayerStore';

export function PlayersPage() {
  const players = usePlayerStore((state) => state.players);
  const updatePlayer = usePlayerStore((state) => state.updatePlayer);
  const deletePlayer = usePlayerStore((state) => state.deletePlayer);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const leaderboard = useMemo(
    () =>
      players
        .map((player) => ({ player, stats: calculatePlayerStats(player.id).totals }))
        .sort((a, b) => b.stats.points - a.stats.points || b.stats.gd - a.stats.gd),
    [players],
  );

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function commitEdit(player: (typeof players)[number]) {
    const name = editName.trim();
    if (name && name !== player.name) updatePlayer({ ...player, name });
    setEditingId(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus player "${name}"? Statistiknya akan hilang dan tim yang dimilikinya menjadi tanpa owner.`)) return;
    deletePlayer(id);
  }

  return (
    <Shell active="players" title="Players">
      <div className="panel">
        <div className="panel-head">
          <h2>Global Leaderboard</h2>
        </div>
        <div className="panel-body">
          {leaderboard.length === 0 ? (
            <div className="empty">Belum ada player.</div>
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
                      {editingId === player.id ? (
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
                        <span onClick={() => startEdit(player.id, player.name)} style={{ cursor: 'pointer' }} title="Klik untuk edit nama">
                          <Link to={`/player/${player.id}`} onClick={(event) => event.stopPropagation()}>
                            {player.name}
                          </Link>{' '}
                          <span className="muted" style={{ fontSize: '0.8em' }}>
                            edit
                          </span>
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
                      <button className="btn btn-xs danger" type="button" onClick={() => handleDelete(player.id, player.name)}>
                        Remove
                      </button>
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
