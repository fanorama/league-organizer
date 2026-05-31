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
  const [wheelLabel, setWheelLabel] = useState('Ready');
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (open) {
      fetchSeasons();
      fetchMatches();
      setSelected(null);
      setSelectedPlayerId('');
      setNewPlayerName('');
      setWheelLabel('Ready');
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
    setWheelLabel('Ready');
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

  const tierLabel = activeTier ? `${activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} (${tierCounts[activeTier]} tersisa)` : '';

  function handleSpin() {
    if (!poolTeams.length || !selectedSkill) return;
    const winner = pickWeightedClub(poolTeams, selectedSkill);
    if (!winner) return;
    rotationRef.current += 720 + Math.floor(Math.random() * 720);
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    }
    setWheelLabel(winner.shortName || winner.name);
    window.setTimeout(() => setSelected(winner), 900);
  }

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const trimmedNewPlayerName = newPlayerName.trim();
    if (selectedPlayerId === '__new__' && !trimmedNewPlayerName) return;
    if (selectedPlayerId !== '__new__' && !canAssignPlayerToLeague(selectedPlayerId, allTeams, leagueId)) return;
    const player = selectedPlayerId === '__new__'
      ? await addPlayer({ name: trimmedNewPlayerName, createdAt: new Date().toISOString() })
      : assignablePlayers.find((c) => c.id === selectedPlayerId);
    if (!player) return;
    await updateTeam({ ...selected, ownerId: player.id, owner: player.name, status: 'active' });
    setSelected(null);
    setSelectedPlayerId('');
    setNewPlayerName('');
    setWheelLabel('Ready');
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
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h2>Assign owner</h2>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="wheel" ref={wheelRef}>
            <span>{wheelLabel}</span>
          </div>
          <div className="list">
            {selected ? (
              <form className="list" onSubmit={handleAssign}>
                <div className="field">
                  <label>Confirm owner for {selected.name}</label>
                </div>
                <button className="btn primary" type="submit">
                  Assign
                </button>
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
                      <span className={`badge skill-badge skill-${selectedSkill}`}>
                        {selectedSkill}
                      </span>
                    )}
                  </div>
                ) : null}
                <button
                  className="btn primary"
                  type="button"
                  onClick={handleSpin}
                  disabled={!selectedPlayerId}
                >
                  Spin
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
