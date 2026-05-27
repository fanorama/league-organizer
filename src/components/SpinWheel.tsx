import { useMemo, useRef, useState } from 'react';
import { useTeamStore } from '../store/useTeamStore';
import type { Team } from '../lib/types';

interface SpinWheelProps {
  leagueId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function SpinWheel({ leagueId, open, onClose, onDone }: SpinWheelProps) {
  const allTeams = useTeamStore((s) => s.teams);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const [selected, setSelected] = useState<Team | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [wheelLabel, setWheelLabel] = useState('Ready');
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);

  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === leagueId), [allTeams, leagueId]);
  const poolTeams = useMemo(() => teams.filter((team) => (team.status || 'pool') === 'pool'), [teams]);

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

  function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    updateTeam({ ...selected, owner: ownerInput.trim(), status: 'active' });
    setSelected(null);
    setOwnerInput('');
    setWheelLabel('Ready');
    onDone();
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
                  <input
                    name="owner"
                    required
                    placeholder="Owner name"
                    autoFocus
                    value={ownerInput}
                    onChange={(event) => setOwnerInput(event.target.value)}
                  />
                </div>
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
