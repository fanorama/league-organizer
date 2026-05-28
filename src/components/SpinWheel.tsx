import { useMemo, useRef, useState } from 'react';
import { useTeamStore } from '../store/useTeamStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from '../lib/playerAssignment';
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
  const [selected, setSelected] = useState<Team | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [wheelLabel, setWheelLabel] = useState('Ready');
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);

  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === leagueId), [allTeams, leagueId]);
  const poolTeams = useMemo(() => teams.filter((team) => (team.status || 'pool') === 'pool'), [teams]);
  const assignablePlayers = useMemo(() => getAssignablePlayersForLeague(players, allTeams, leagueId), [players, allTeams, leagueId]);

  function handleSpin() {
    if (!poolTeams.length) return;
    const winner = poolTeams[Math.floor(Math.random() * poolTeams.length)];
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
      : assignablePlayers.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return;
    await updateTeam({ ...selected, ownerId: player.id, owner: player.name, status: 'active' });
    setSelected(null);
    setSelectedPlayerId('');
    setNewPlayerName('');
    setWheelLabel('Ready');
    await onDone();
  }

  if (!open) return null;

  return (
    <div className="modal open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
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
                  <label>Owner for {selected.name}</label>
                  <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)} required>
                    <option value="">-- Pilih player --</option>
                    {assignablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
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
                      onChange={(event) => setNewPlayerName(event.target.value)}
                      placeholder="Nama player"
                      required
                      autoFocus
                    />
                  </div>
                ) : null}
                <button className="btn primary" type="submit">
                  Assign
                </button>
              </form>
            ) : poolTeams.length ? (
              <>
                <p className="muted">{poolTeams.length} teams waiting for owner assignment.</p>
                <button className="btn primary" type="button" onClick={handleSpin}>
                  Spin
                </button>
              </>
            ) : (
              <div className="empty">No pool teams available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
