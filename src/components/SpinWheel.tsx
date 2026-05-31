import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMatchStore } from '../store/useMatchStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';
import { DRAW_ORDER, getActiveDrawTier, pickWeightedClub, type PlayerWithSkill } from '../lib/balancedDraw';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from '../lib/playerAssignment';
import { resolvePlayerSkill, type SkillTier } from '../lib/playerSkill';
import { calculatePlayerStatsFromData } from '../lib/playerStats';
import type { Team } from '../lib/types';

interface SpinWheelProps {
  leagueId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}

const SEGMENT_COLORS = ['#f0b429', '#e03050', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

function clubLabel(team: Team, maxLen: number): string {
  const name = team.shortName || team.name;
  if (maxLen >= name.length) return name;
  const abbr = name.replace(/[^A-Z0-9]/g, '').slice(0, 3) || name.slice(0, 3).toUpperCase();
  return abbr;
}

export function SpinWheel({ leagueId, open, onClose, onDone }: SpinWheelProps) {
  const allTeams = useTeamStore((s) => s.teams);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const players = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const updatePlayer = usePlayerStore((s) => s.updatePlayer);
  const seasons = useSeasonStore((s) => s.seasons);
  const matches = useMatchStore((s) => s.matches);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [selected, setSelected] = useState<Team | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const spinWinnerRef = useRef<Team | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchSeasons();
      fetchMatches();
      setSelected(null);
      setSelectedPlayerId('');
      setNewPlayerName('');
      setIsSpinning(false);
      spinWinnerRef.current = null;
    }
  }, [open, fetchSeasons, fetchMatches]);

  const teams = useMemo(() => allTeams.filter((t) => t.leagueId === leagueId), [allTeams, leagueId]);
  const poolTeams = useMemo(() => teams.filter((t) => (t.status || 'pool') === 'pool'), [teams]);
  const assignablePlayers = useMemo(() => getAssignablePlayersForLeague(players, allTeams, leagueId), [players, allTeams, leagueId]);

  const playerSkills = useMemo<PlayerWithSkill[]>(() => {
    if (!open) return [];
    return assignablePlayers.map((p) => ({
      player: p,
      skill: resolvePlayerSkill(p, calculatePlayerStatsFromData(p.id, allTeams, seasons, matches).totals),
    }));
  }, [open, assignablePlayers, allTeams, seasons, matches]);

  const activeTier = useMemo(() => {
    if (!open) return null;
    return getActiveDrawTier(playerSkills);
  }, [open, playerSkills]);

  useEffect(() => {
    setSelectedPlayerId('');
    setNewPlayerName('');
    setSelected(null);
  }, [activeTier]);

  const activeTierPlayers = useMemo(() => {
    if (!activeTier) return [];
    return playerSkills.filter((ps) => ps.skill === activeTier);
  }, [playerSkills, activeTier]);

  const selectedPlayer = useMemo(() => {
    return playerSkills.find((ps) => ps.player.id === selectedPlayerId);
  }, [playerSkills, selectedPlayerId]);

  const selectedSkill = selectedPlayer?.skill ?? null;
  const showAddNew = activeTier === 'sedang';

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { pemula: 0, sedang: 0, jago: 0 };
    for (const ps of playerSkills) counts[ps.skill]++;
    return counts;
  }, [playerSkills]);

  const tierLabel = activeTier
    ? `${activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} (${tierCounts[activeTier]} tersisa)`
    : '';

  const sliceDeg = poolTeams.length > 0 ? 360 / poolTeams.length : 0;

  const conicGradient = useMemo(() => {
    if (!poolTeams.length) return undefined;
    const stops = poolTeams.map((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      return `${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [poolTeams, sliceDeg]);

  const segmentLabels = useMemo(() => {
    const count = poolTeams.length;
    const maxLen = count <= 8 ? 14 : count <= 12 ? 3 : 2;
    const fontSize = count <= 8 ? 11 : count <= 12 ? 10 : 9;
    const radius = 148;
    return poolTeams.map((team, i) => {
      const deg = i * sliceDeg + sliceDeg / 2;
      const flip = deg > 90 && deg < 270;
      return (
        <span
          key={team.id}
          className="wheel-segment-label"
          style={{
            transform: `rotate(${deg}deg) translateY(-${radius}px) rotate(${flip ? 180 - deg : -deg}deg)`,
            fontSize: `${fontSize}px`,
          }}
        >
          {clubLabel(team, maxLen)}
        </span>
      );
    });
  }, [poolTeams, sliceDeg]);

  function handleSpin() {
    if (!poolTeams.length || !selectedSkill || isSpinning) return;
    const winner = pickWeightedClub(poolTeams, selectedSkill);
    if (!winner) return;

    spinWinnerRef.current = winner;

    const winnerIndex = poolTeams.findIndex((t) => t.id === winner.id);
    const segmentCenter = (winnerIndex * sliceDeg + sliceDeg / 2) % 360;
    const currentPos = ((rotationRef.current % 360) + 360) % 360;
    const delta = ((360 - ((segmentCenter + currentPos) % 360)) % 360 + 360) % 360;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fullSpins = prefersReducedMotion ? 0 : 5 * 360;
    rotationRef.current += fullSpins + delta;

    if (wheelRef.current) {
      if (prefersReducedMotion) {
        wheelRef.current.style.transition = 'none';
      } else {
        wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.06, 0.73, 0.14, 1)';
      }
      wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    }

    setIsSpinning(true);

    if (prefersReducedMotion) {
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
      }
      setIsSpinning(false);
      setSelected(winner);
      return;
    }

    spinTimerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setSelected(winner);
    }, 4000);
  }

  function handleSkipSpin() {
    if (!isSpinning || !spinWinnerRef.current || !wheelRef.current) return;
    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
    }
    wheelRef.current.style.transition = 'transform 0.2s cubic-bezier(0.06, 0.73, 0.14, 1)';
    wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    setIsSpinning(false);
    setSelected(spinWinnerRef.current);
  }

  function handleSpinAgain() {
    setSelected(null);
    handleSpin();
  }

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const trimmedNewPlayerName = newPlayerName.trim();
    if (selectedPlayerId === '__new__' && !trimmedNewPlayerName) return;
    if (selectedPlayerId !== '__new__' && !canAssignPlayerToLeague(selectedPlayerId, allTeams, leagueId)) return;
    const player =
      selectedPlayerId === '__new__'
        ? await addPlayer({ name: trimmedNewPlayerName, createdAt: new Date().toISOString() })
        : assignablePlayers.find((c) => c.id === selectedPlayerId);
    if (!player) return;
    await updateTeam({ ...selected, ownerId: player.id, owner: player.name, status: 'active' });
    setSelected(null);
    setSelectedPlayerId('');
    setNewPlayerName('');
    await onDone();
  }

  async function cycleSkillOverride() {
    if (!selectedPlayer || !isAdmin) return;
    const cycle: (SkillTier | null)[] = ['jago', 'sedang', 'pemula', null];
    const current = selectedPlayer.player.skillOverride ?? null;
    const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
    await updatePlayer({ ...selectedPlayer.player, skillOverride: cycle[nextIndex] });
  }

  if (!open) return null;

  const tierOrderLabel = DRAW_ORDER.map((t) => {
    const first = t.charAt(0).toUpperCase() + t.slice(1);
    const count = tierCounts[t];
    if (t === activeTier) return `${first} ← (${count})`;
    return `${first} (${count})`;
  }).join(' → ');

  return (
    <div
      className="modal open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card spinwheel-modal">
        <div className="modal-head">
          <h2>Assign owner</h2>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="wheel-stage">
            <div className="wheel-pointer" />
            <div
              className={`wheel${isSpinning ? ' is-spinning' : ''}`}
              ref={wheelRef}
              style={{ backgroundImage: conicGradient }}
              onClick={isSpinning ? handleSkipSpin : undefined}
            >
              {segmentLabels}
            </div>
            <div className="wheel-hub">
              {selected ? (
                selected.logo ? (
                  <img src={selected.logo} alt={selected.name} className="wheel-hub-logo" />
                ) : (
                  <span className="wheel-hub-name">{selected.shortName || selected.name}</span>
                )
              ) : isSpinning ? (
                <span className="wheel-hub-text">...</span>
              ) : (
                <span className="wheel-hub-text">Pick a player</span>
              )}
            </div>
          </div>
          {isSpinning ? <p className="wheel-skip-hint">Tap wheel to reveal</p> : null}
          <div className="list">
            {selected ? (
              <form className="list" onSubmit={handleAssign}>
                <div className="field">
                  <label>Confirm owner for {selected.name}</label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="button" onClick={handleSpinAgain}>
                    Spin Again
                  </button>
                  <button className="btn primary" type="submit">
                    Assign
                  </button>
                </div>
              </form>
            ) : !activeTier ? (
              <div className="empty">Semua pemain sudah kebagian klub.</div>
            ) : !poolTeams.length ? (
              <div className="empty">Klub pool habis.</div>
            ) : (
              <>
                <p className="muted" style={{ textAlign: 'center' }}>
                  Urutan: {tierOrderLabel}
                </p>
                <div className="field">
                  <label>Pilih pemain — Giliran: {tierLabel}</label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih player --</option>
                    {activeTierPlayers.map((ps) => (
                      <option key={ps.player.id} value={ps.player.id}>
                        {ps.player.name}
                      </option>
                    ))}
                    {showAddNew ? <option value="__new__">+ Tambah player baru</option> : null}
                  </select>
                </div>
                {selectedPlayerId === '__new__' ? (
                  <div className="field">
                    <label>Nama player baru</label>
                    <input
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Nama player"
                      required
                      autoFocus
                    />
                  </div>
                ) : null}
                {selectedPlayer && selectedSkill ? (
                  <div className="field">
                    <label>Skill</label>
                    {isAdmin ? (
                      <button
                        type="button"
                        className={`badge skill-badge skill-${selectedSkill}`}
                        onClick={cycleSkillOverride}
                        title="Klik untuk override skill"
                      >
                        {selectedSkill}
                      </button>
                    ) : (
                      <span className={`badge skill-badge skill-${selectedSkill}`}>{selectedSkill}</span>
                    )}
                  </div>
                ) : null}
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleSpin}
                  disabled={!selectedPlayerId || isSpinning}
                >
                  {isSpinning ? 'Spinning…' : 'Spin'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
