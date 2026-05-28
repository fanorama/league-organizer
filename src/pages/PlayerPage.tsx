import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { calculateHeadToHeadFromData, calculatePlayerStatsFromData, type AggregatedStats, type H2HStats } from '../lib/playerStats';
import { useLeagueStore } from '../store/useLeagueStore';
import { useMatchStore } from '../store/useMatchStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const players = usePlayerStore((state) => state.players);
  const fetchPlayers = usePlayerStore((state) => state.fetchPlayers);
  const leagues = useLeagueStore((state) => state.leagues);
  const fetchLeagues = useLeagueStore((state) => state.fetchLeagues);
  const teams = useTeamStore((state) => state.teams);
  const fetchTeams = useTeamStore((state) => state.fetchTeams);
  const seasons = useSeasonStore((state) => state.seasons);
  const fetchSeasons = useSeasonStore((state) => state.fetchSeasons);
  const matches = useMatchStore((state) => state.matches);
  const fetchMatches = useMatchStore((state) => state.fetchMatches);
  const [h2hOpponentId, setH2hOpponentId] = useState('');

  useEffect(() => {
    fetchPlayers();
    fetchLeagues();
    fetchTeams();
    fetchSeasons();
    fetchMatches();
  }, [fetchPlayers, fetchLeagues, fetchTeams, fetchSeasons, fetchMatches]);

  const player = players.find((candidate) => candidate.id === id);
  const stats = useMemo(() => (id ? calculatePlayerStatsFromData(id, teams, seasons, matches) : null), [id, teams, seasons, matches]);
  const h2h = useMemo(() => (id && h2hOpponentId ? calculateHeadToHeadFromData(id, h2hOpponentId, seasons, matches) : null), [id, h2hOpponentId, seasons, matches]);

  if (!player || !stats) {
    return (
      <Shell active="players" title="Player">
        <div className="empty">Player tidak ditemukan.</div>
      </Shell>
    );
  }

  const opponents = players.filter((candidate) => candidate.id !== id);
  const opponent = players.find((candidate) => candidate.id === h2hOpponentId);
  const winRate = stats.totals.played > 0 ? Math.round((stats.totals.won / stats.totals.played) * 100) : 0;
  const ppg = stats.totals.played > 0 ? (stats.totals.points / stats.totals.played).toFixed(2) : '0.00';
  const gpg = stats.totals.played > 0 ? (stats.totals.gf / stats.totals.played).toFixed(2) : '0.00';
  const gdDisplay = stats.totals.gd >= 0 ? `+${stats.totals.gd}` : String(stats.totals.gd);

  return (
    <Shell active="players" title={player.name} actions={<Link className="btn" to="/players">← Back</Link>}>
      <div className="player-hero">
        <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
        <div className="player-hero-info">
          <h2 className="player-hero-name">{player.name}</h2>
          <div className="player-hero-meta">
            <span>{stats.totals.played} matches played</span>
            {stats.totals.championships > 0 && (
              <span className="badge warning">🏆 {stats.totals.championships} Championship{stats.totals.championships > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Win Rate" value={`${winRate}%`} sub={`${stats.totals.won}W · ${stats.totals.drawn}D · ${stats.totals.lost}L`} accent="success" />
        <StatCard label="Points" value={stats.totals.points} sub={`${ppg} per game`} accent="primary" />
        <StatCard label="Goals For" value={stats.totals.gf} sub={`${gpg} per game`} />
        <StatCard label="Goal Diff" value={gdDisplay} sub={`${stats.totals.ga} conceded`} accent={stats.totals.gd >= 0 ? 'success' : 'danger'} />
      </div>

      {stats.totals.played > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head"><h2>Performance</h2></div>
          <div className="panel-body">
            <PerfBar stats={stats.totals} />
          </div>
        </div>
      )}

      {stats.leagues.map((leagueStats) => {
        const league = leagues.find((candidate) => candidate.id === leagueStats.leagueId);
        const leagueWinRate = leagueStats.stats.played > 0
          ? Math.round((leagueStats.stats.won / leagueStats.stats.played) * 100)
          : 0;
        return (
          <div className="panel" key={leagueStats.leagueId} style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <h2>{league?.name ?? leagueStats.leagueId}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {leagueStats.championships > 0 && (
                  <span className="badge warning">🏆 {leagueStats.championships}x Champ</span>
                )}
                <span className="badge">{leagueWinRate}% WR</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="league-stat-grid">
                <MiniStat label="M" value={leagueStats.stats.played} />
                <MiniStat label="W" value={leagueStats.stats.won} accent="success" />
                <MiniStat label="D" value={leagueStats.stats.drawn} />
                <MiniStat label="L" value={leagueStats.stats.lost} accent="danger" />
                <MiniStat label="GF" value={leagueStats.stats.gf} />
                <MiniStat label="GA" value={leagueStats.stats.ga} />
                <MiniStat label="GD" value={leagueStats.stats.gd >= 0 ? `+${leagueStats.stats.gd}` : leagueStats.stats.gd} accent={leagueStats.stats.gd >= 0 ? 'success' : 'danger'} />
                <MiniStat label="Pts" value={leagueStats.stats.points} accent="primary" />
              </div>
              {leagueStats.stats.played > 0 && <PerfBar stats={leagueStats.stats} compact />}
              <div style={{ marginTop: 12 }}>
                <span className="muted">Klub: </span>
                <span>{leagueStats.teams.map((team) => team.teamName).join(', ')}</span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="panel">
        <div className="panel-head"><h2>Head-to-Head</h2></div>
        <div className="panel-body list">
          <div className="field">
            <label>Pilih lawan</label>
            <select value={h2hOpponentId} onChange={(event) => setH2hOpponentId(event.target.value)}>
              <option value="">-- Pilih player --</option>
              {opponents.map((opp) => (
                <option key={opp.id} value={opp.id}>{opp.name}</option>
              ))}
            </select>
          </div>
          {h2h && opponent && (
            <H2HComparison h2h={h2h} playerName={player.name} opponentName={opponent.name} />
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'primary' | 'success' | 'danger';
}) {
  const accentColors: Record<string, string> = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    danger: 'var(--danger)',
  };
  const color = accent ? accentColors[accent] : 'var(--text)';
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, accent }: {
  label: string;
  value: string | number;
  accent?: 'primary' | 'success' | 'danger';
}) {
  const accentColors: Record<string, string> = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    danger: 'var(--danger)',
  };
  const color = accent ? accentColors[accent] : 'var(--text)';
  return (
    <div className="mini-stat">
      <div className="mini-stat-value" style={{ color }}>{value}</div>
      <div className="mini-stat-label">{label}</div>
    </div>
  );
}

function PerfBar({ stats, compact }: { stats: AggregatedStats; compact?: boolean }) {
  if (stats.played === 0) return null;
  const wPct = (stats.won / stats.played) * 100;
  const dPct = (stats.drawn / stats.played) * 100;
  const lPct = (stats.lost / stats.played) * 100;
  return (
    <div className={compact ? 'perf-bar-compact' : 'perf-bar-wrap'}>
      <div className="perf-bar">
        <div className="perf-bar-w" style={{ width: `${wPct}%` }} title={`Win: ${stats.won}`} />
        <div className="perf-bar-d" style={{ width: `${dPct}%` }} title={`Draw: ${stats.drawn}`} />
        <div className="perf-bar-l" style={{ width: `${lPct}%` }} title={`Loss: ${stats.lost}`} />
      </div>
      {!compact && (
        <div className="perf-bar-legend">
          <span className="perf-legend-w">{stats.won} Win</span>
          <span className="perf-legend-d">{stats.drawn} Draw</span>
          <span className="perf-legend-l">{stats.lost} Loss</span>
        </div>
      )}
    </div>
  );
}

function H2HComparison({ h2h, playerName, opponentName }: {
  h2h: H2HStats;
  playerName: string;
  opponentName: string;
}) {
  if (h2h.played === 0) {
    return <div className="muted" style={{ textAlign: 'center', padding: '16px 0' }}>Belum ada pertandingan H2H.</div>;
  }

  const total = h2h.played;
  const wPct = (h2h.winsA / total) * 100;
  const dPct = (h2h.draws / total) * 100;
  const lPct = (h2h.winsB / total) * 100;
  const avgGfA = (h2h.gfA / total).toFixed(1);
  const avgGfB = (h2h.gfB / total).toFixed(1);

  return (
    <div className="h2h-wrap">
      <div className="h2h-header">
        <div className="h2h-player">{playerName}</div>
        <div className="h2h-score">
          <span className="h2h-wins-a">{h2h.winsA}</span>
          <span className="h2h-sep">–</span>
          <span className="h2h-draws">{h2h.draws}</span>
          <span className="h2h-sep">–</span>
          <span className="h2h-wins-b">{h2h.winsB}</span>
        </div>
        <div className="h2h-player h2h-player-b">{opponentName}</div>
      </div>

      <div className="perf-bar" style={{ height: 10, borderRadius: 5 }}>
        <div className="perf-bar-w" style={{ width: `${wPct}%` }} />
        <div className="perf-bar-d" style={{ width: `${dPct}%` }} />
        <div className="perf-bar-l" style={{ width: `${lPct}%` }} />
      </div>

      <div className="h2h-detail-grid">
        <div className="h2h-detail-block">
          <div className="h2h-detail-value" style={{ color: 'var(--primary)' }}>{h2h.gfA}</div>
          <div className="h2h-detail-label">Goals</div>
          <div className="h2h-detail-avg">{avgGfA}/game</div>
        </div>
        <div className="h2h-detail-block h2h-detail-center">
          <div className="h2h-detail-value" style={{ color: 'var(--muted)' }}>{total}</div>
          <div className="h2h-detail-label">Matches</div>
        </div>
        <div className="h2h-detail-block h2h-detail-right">
          <div className="h2h-detail-value" style={{ color: 'var(--accent)' }}>{h2h.gfB}</div>
          <div className="h2h-detail-label">Goals</div>
          <div className="h2h-detail-avg">{avgGfB}/game</div>
        </div>
      </div>
    </div>
  );
}
