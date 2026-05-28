import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQuickMatchStore } from '../store/useQuickMatchStore';

export function QuickMatchPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const players = usePlayerStore((state) => state.players);
  const fetchPlayers = usePlayerStore((state) => state.fetchPlayers);
  const sessions = useQuickMatchStore((state) => state.sessions);
  const fetchSessions = useQuickMatchStore((state) => state.fetchSessions);
  const startSession = useQuickMatchStore((state) => state.startSession);
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchSessions();
  }, [fetchPlayers, fetchSessions]);

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  async function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!player1Id || !player2Id) return;
    if (player1Id === player2Id) {
      setError('Pilih dua player berbeda.');
      return;
    }
    const session = await startSession(player1Id, player2Id);
    navigate(`/quick-match/${session.id}`);
  }

  return (
    <Shell active="quick-match" title="Quick Match">
      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Riwayat Sesi</h2></div>
          <div className="panel-body list">
            {sessions.length === 0 ? (
              <div className="empty">Belum ada sesi quick match.</div>
            ) : sessions.map((session) => {
              const player1 = playersById.get(session.player1Id);
              const player2 = playersById.get(session.player2Id);
              return (
                <Link className="list-row session-row" to={`/quick-match/${session.id}`} key={session.id}>
                  <div>
                    <div className="team-name">{player1?.name ?? session.player1Id} vs {player2?.name ?? session.player2Id}</div>
                    <div className="muted">{formatDate(session.createdAt)}</div>
                  </div>
                  <span className={`badge badge-${session.status}`}>{session.status}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {isAdmin ? (
          <section className="card">
            <h2>Mulai sesi</h2>
            <form className="list" onSubmit={handleStart}>
              <div className="field">
                <label>Player 1</label>
                <select value={player1Id} onChange={(event) => setPlayer1Id(event.target.value)} required>
                  <option value="">-- Pilih player --</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Player 2</label>
                <select value={player2Id} onChange={(event) => setPlayer2Id(event.target.value)} required>
                  <option value="">-- Pilih player --</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              {error ? <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div> : null}
              <button className="btn primary" type="submit" disabled={players.length < 2}>Mulai</button>
            </form>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
