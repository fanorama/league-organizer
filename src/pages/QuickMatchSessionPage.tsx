import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClubPickerModal } from '../components/ClubPickerModal';
import { Shell } from '../components/Shell';
import type { ClubFromApi, QuickMatchGame } from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQuickMatchStore } from '../store/useQuickMatchStore';

export function QuickMatchSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const players = usePlayerStore((state) => state.players);
  const fetchPlayers = usePlayerStore((state) => state.fetchPlayers);
  const sessions = useQuickMatchStore((state) => state.sessions);
  const gamesBySession = useQuickMatchStore((state) => state.gamesBySession);
  const fetchSessions = useQuickMatchStore((state) => state.fetchSessions);
  const fetchGames = useQuickMatchStore((state) => state.fetchGames);
  const addGame = useQuickMatchStore((state) => state.addGame);
  const finishSession = useQuickMatchStore((state) => state.finishSession);
  const [p1CompetitionId, setP1CompetitionId] = useState<string | undefined>();
  const [p2CompetitionId, setP2CompetitionId] = useState<string | undefined>();
  const [showClubPicker, setShowClubPicker] = useState(false);
  const [player1Club, setPlayer1Club] = useState<ClubFromApi | null>(null);
  const [player2Club, setPlayer2Club] = useState<ClubFromApi | null>(null);
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchSessions();
    if (sessionId) fetchGames(sessionId);
  }, [fetchPlayers, fetchSessions, fetchGames, sessionId]);

  const session = sessions.find((candidate) => candidate.id === sessionId);
  const games = gamesBySession[sessionId] ?? [];
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const player1 = session ? playersById.get(session.player1Id) : null;
  const player2 = session ? playersById.get(session.player2Id) : null;
  const aggregate = useMemo(() => calculateAggregate(games), [games]);
  const readOnly = session?.status === 'finished' || !isAdmin;

  async function handleAddGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || readOnly) return;
    const score1 = Number(player1Score);
    const score2 = Number(player2Score);
    if (!player1Club || !player2Club || Number.isNaN(score1) || Number.isNaN(score2)) return;

    await addGame({
      sessionId: session.id,
      player1Club: { id: player1Club.id, name: player1Club.name, logo: player1Club.logo },
      player2Club: { id: player2Club.id, name: player2Club.name, logo: player2Club.logo },
      player1Score: score1,
      player2Score: score2,
      createdAt: new Date().toISOString(),
    });
    setPlayer1Score('');
    setPlayer2Score('');
  }

  function handleConfirmClubs(nextPlayer1Club: ClubFromApi, nextPlayer2Club: ClubFromApi, nextP1CompetitionId: string, nextP2CompetitionId: string) {
    setPlayer1Club(nextPlayer1Club);
    setPlayer2Club(nextPlayer2Club);
    setP1CompetitionId(nextP1CompetitionId);
    setP2CompetitionId(nextP2CompetitionId);
    setShowClubPicker(false);
  }

  async function handleFinish() {
    if (!session || session.status === 'finished') return;
    await finishSession(session);
  }

  if (!session) {
    return (
      <Shell active="quick-match" title="Quick Match" actions={<Link className="btn" to="/quick-match">Back</Link>}>
        <div className="empty">Sesi tidak ditemukan.</div>
      </Shell>
    );
  }

  return (
    <Shell active="quick-match" title={`${player1?.name ?? 'Player 1'} vs ${player2?.name ?? 'Player 2'}`} actions={<Link className="btn" to="/quick-match">Back</Link>}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2>Skor Agregat</h2>
          <div className="actions">
            <span className={`badge badge-${session.status}`}>{session.status}</span>
            {!readOnly ? <button className="btn btn-xs danger" type="button" onClick={handleFinish}>Akhiri Sesi</button> : null}
          </div>
        </div>
        <div className="panel-body">
          <div className="quick-scoreboard">
            <ScoreBlock name={player1?.name ?? session.player1Id} wins={aggregate.player1Wins} />
            <div className="quick-score-divider">{aggregate.draws}D</div>
            <ScoreBlock name={player2?.name ?? session.player2Id} wins={aggregate.player2Wins} alignRight />
          </div>
        </div>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Game</h2></div>
          <div className="panel-body list">
            {games.length === 0 ? <div className="empty">Belum ada game.</div> : games.map((game) => (
              <div className="list-row" key={game.id}>
                <ClubLine club={game.player1Club} />
                <strong>{game.player1Score} - {game.player2Score}</strong>
                <ClubLine club={game.player2Club} alignRight />
              </div>
            ))}
          </div>
        </section>

        {!readOnly ? (
          <section className="card">
            <h2>Input game</h2>
            <form className="list" onSubmit={handleAddGame}>
              <div className="quick-club-selection">
                <SelectedClub label={player1?.name ?? 'Player 1'} club={player1Club} />
                <SelectedClub label={player2?.name ?? 'Player 2'} club={player2Club} alignRight />
              </div>
              <button className="btn" type="button" onClick={() => setShowClubPicker(true)}>Pilih Klub</button>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="quick-player1-score">Skor {player1?.name ?? 'Player 1'}</label>
                  <input id="quick-player1-score" min={0} type="number" value={player1Score} onChange={(event) => setPlayer1Score(event.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="quick-player2-score">Skor {player2?.name ?? 'Player 2'}</label>
                  <input id="quick-player2-score" min={0} type="number" value={player2Score} onChange={(event) => setPlayer2Score(event.target.value)} required />
                </div>
              </div>
              <button className="btn primary" type="submit" disabled={!player1Club || !player2Club}>Simpan game</button>
            </form>
          </section>
        ) : null}
      </div>
      {showClubPicker ? (
        <ClubPickerModal
          player1Name={player1?.name ?? 'Player 1'}
          player2Name={player2?.name ?? 'Player 2'}
          initialP1CompetitionId={p1CompetitionId}
          initialP2CompetitionId={p2CompetitionId}
          onConfirm={handleConfirmClubs}
          onClose={() => setShowClubPicker(false)}
        />
      ) : null}
    </Shell>
  );
}

function calculateAggregate(games: QuickMatchGame[]) {
  return games.reduce(
    (total, game) => {
      if (game.player1Score > game.player2Score) total.player1Wins += 1;
      else if (game.player2Score > game.player1Score) total.player2Wins += 1;
      else total.draws += 1;
      return total;
    },
    { player1Wins: 0, player2Wins: 0, draws: 0 },
  );
}

function ScoreBlock({ name, wins, alignRight }: { name: string; wins: number; alignRight?: boolean }) {
  return (
    <div className={alignRight ? 'quick-score-block right' : 'quick-score-block'}>
      <div className="muted">{name}</div>
      <strong>{wins}W</strong>
    </div>
  );
}

function SelectedClub({ label, club, alignRight }: { label: string; club: ClubFromApi | null; alignRight?: boolean }) {
  return (
    <div className={alignRight ? 'quick-selected-club right' : 'quick-selected-club'}>
      <span className="muted">{label}</span>
      {club ? <ClubLine club={club} alignRight={alignRight} /> : <strong>Belum dipilih</strong>}
    </div>
  );
}

function ClubLine({ club, alignRight }: { club: { name: string; logo?: string }; alignRight?: boolean }) {
  return (
    <span className="team-line" style={alignRight ? { justifyContent: 'flex-end', textAlign: 'right' } : undefined}>
      {club.logo ? <span className="team-badge"><img src={club.logo} alt="" /></span> : null}
      <span>{club.name}</span>
    </span>
  );
}
