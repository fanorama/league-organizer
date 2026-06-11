import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';
import { DRAW_ORDER, pickWeightedClub, type PlayerWithSkill } from '../lib/balancedDraw';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from '../lib/playerAssignment';
import { resolvePlayerSkill } from '../lib/playerSkill';
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

// Logo klub disimpan sebagai URL — biasanya di `badge` (hasil import), kadang
// di `logo`. Sama seperti TeamBadge: dianggap gambar bila berpola URL/path.
function teamLogoUrl(team: Team): string | undefined {
  const value = team.logo || team.badge;
  return value && /^(https?:\/\/|\/|data:)/.test(value) ? value : undefined;
}

export function SpinWheel({ leagueId, open, onClose, onDone }: SpinWheelProps) {
  const allTeams = useTeamStore((s) => s.teams);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const players = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const seasons = useSeasonStore((s) => s.seasons);
  const matches = useMatchStore((s) => s.matches);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);

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
  const readyTeams = useMemo(() => teams.filter((t) => (t.status || 'pool') === 'ready'), [teams]);
  const assignablePlayers = useMemo(() => getAssignablePlayersForLeague(players, allTeams, leagueId), [players, allTeams, leagueId]);

  const playerSkills = useMemo<PlayerWithSkill[]>(() => {
    if (!open) return [];
    return assignablePlayers.map((p) => ({
      player: p,
      skill: resolvePlayerSkill(p, calculatePlayerStatsFromData(p.id, allTeams, seasons, matches).totals),
    }));
  }, [open, assignablePlayers, allTeams, seasons, matches]);

  // Semua pemain ditampilkan sekaligus, tetapi diurutkan sesuai skill —
  // tier kuat lebih dulu (DRAW_ORDER). Tidak lagi dipaksa satu tier per spin.
  const sortedPlayers = useMemo(() => {
    const rank = (skill: PlayerWithSkill['skill']) => DRAW_ORDER.indexOf(skill);
    return [...playerSkills].sort((a, b) => rank(a.skill) - rank(b.skill));
  }, [playerSkills]);

  const selectedPlayer = useMemo(() => {
    return playerSkills.find((ps) => ps.player.id === selectedPlayerId);
  }, [playerSkills, selectedPlayerId]);

  // Pemain baru belum punya statistik → default tier `sedang`.
  const selectedSkill = selectedPlayerId === '__new__' ? 'sedang' : selectedPlayer?.skill ?? null;

  // Putaran pelan saat idle (belum spin, belum ada pemenang). Memakai
  // rotationRef yang sama dengan spin asli sehingga pointer tetap akurat.
  useEffect(() => {
    if (!open || isSpinning || selected) return;
    const el = wheelRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.style.transition = 'none';
    let raf = 0;
    let last = performance.now();
    const speed = 7; // derajat per detik
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      rotationRef.current += speed * dt;
      el.style.transform = `rotate(${rotationRef.current}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, isSpinning, selected]);

  const sliceDeg = readyTeams.length > 0 ? 360 / readyTeams.length : 0;

  const conicGradient = useMemo(() => {
    if (!readyTeams.length) return undefined;
    const stops = readyTeams.map((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      return `${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [readyTeams, sliceDeg]);

  const segmentLabels = useMemo(() => {
    const count = readyTeams.length;
    const maxLen = count <= 8 ? 16 : count <= 14 ? 12 : 9;
    const fontSize = count <= 8 ? 13 : count <= 14 ? 11 : 9.5;
    return readyTeams.map((team, i) => {
      // Sudut tengah segmen, diukur searah jarum jam dari posisi jam-12.
      const deg = i * sliceDeg + sliceDeg / 2;
      // Label berupa "jeruji" dari pusat ke rim; rim ada di ujung +x batang,
      // jadi rotasi batang = deg - 90 agar mengarah ke tengah segmen.
      const barRotation = deg - 90;
      // Paruh kiri (180°–360°) membuat teks terbaca terbalik → putar 180°.
      const flip = deg > 180;
      return (
        <span
          key={team.id}
          className="wheel-segment-label"
          style={{ transform: `rotate(${barRotation}deg)` }}
        >
          <span
            className="wheel-segment-text"
            style={{ fontSize: `${fontSize}px`, transform: flip ? 'rotate(180deg)' : undefined }}
          >
            {clubLabel(team, maxLen)}
          </span>
        </span>
      );
    });
  }, [readyTeams, sliceDeg]);

  function handleSpin() {
    if (!readyTeams.length || !selectedSkill || isSpinning) return;
    const winner = pickWeightedClub(readyTeams, selectedSkill);
    if (!winner) return;

    spinWinnerRef.current = winner;

    const winnerIndex = readyTeams.findIndex((t) => t.id === winner.id);
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

  if (!open) return null;

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
                teamLogoUrl(selected) ? (
                  <img src={teamLogoUrl(selected)} alt={selected.name} className="wheel-hub-logo" />
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
            ) : !sortedPlayers.length ? (
              <div className="empty">Semua pemain sudah kebagian klub.</div>
            ) : !readyTeams.length ? (
              <div className="empty">Klub pool habis.</div>
            ) : (
              <>
                <div className="field">
                  <label>Pilih pemain</label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih player --</option>
                    {sortedPlayers.map((ps) => (
                      <option key={ps.player.id} value={ps.player.id}>
                        {ps.player.name}
                      </option>
                    ))}
                    <option value="__new__">+ Tambah player baru</option>
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
