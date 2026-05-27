import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Shell } from '../components/Shell';
import { SpinWheel } from '../components/SpinWheel';
import { TeamBadge } from '../components/TeamBadge';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from '../lib/playerAssignment';
import { getSettings } from '../lib/storage';
import type { ClubFromApi } from '../lib/types';
import { useLeagueStore } from '../store/useLeagueStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';

export function TeamsPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const league = useLeagueStore((s) => s.leagues.find((item) => item.id === leagueId));
  const allTeams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const removeTeam = useTeamStore((s) => s.removeTeam);
  const unassignTeam = useTeamStore((s) => s.unassignTeam);
  const refresh = useTeamStore((s) => s.refresh);
  const players = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showWheel, setShowWheel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const currentLeagueId = leagueId || '';
  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === currentLeagueId), [allTeams, currentLeagueId]);
  const activeTeams = useMemo(() => teams.filter((team) => team.status === 'active'), [teams]);
  const poolTeams = useMemo(() => teams.filter((team) => (team.status || 'pool') === 'pool'), [teams]);
  const assignablePlayers = useMemo(() => getAssignablePlayersForLeague(players, allTeams, currentLeagueId), [players, allTeams, currentLeagueId]);

  if (!league || !leagueId) {
    return (
      <Shell active="leagues" title="Teams">
        <div className="empty">League not found.</div>
      </Shell>
    );
  }

  function handleAddTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const shortName = String(data.get('shortName')).trim();
    addTeam({
      leagueId: currentLeagueId,
      name,
      shortName: (shortName || name.slice(0, 3)).toUpperCase(),
      badge: String(data.get('badge')).trim() || (shortName || name.slice(0, 3)).toUpperCase(),
      owner: null,
      status: 'pool',
      externalId: null,
    });
    event.currentTarget.reset();
  }

  function handleAssign(event: React.FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team) return;
    const trimmedNewPlayerName = newPlayerName.trim();
    if (selectedPlayerId === '__new__' && !trimmedNewPlayerName) return;
    if (selectedPlayerId !== '__new__' && !canAssignPlayerToLeague(selectedPlayerId, allTeams, currentLeagueId)) return;
    const player = selectedPlayerId === '__new__'
      ? addPlayer({ name: trimmedNewPlayerName, createdAt: new Date().toISOString() })
      : assignablePlayers.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return;
    updateTeam({ ...team, ownerId: player.id, owner: player.name, status: 'active' });
    setAssigningTeamId(null);
    setSelectedPlayerId('');
    setNewPlayerName('');
  }

  function handleRemove(teamId: string, name: string) {
    if (!confirm(`Remove "${name}" from league?`)) return;
    removeTeam(teamId);
  }

  function handleOpenImport() {
    if (!getSettings().apiKey) {
      navigate('/settings');
      return;
    }
    setShowImport(true);
  }

  return (
    <Shell active="leagues" title={`Teams - ${league.name}`} actions={<Link className="btn" to={`/league/${league.id}`}>Back</Link>}>
      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Teams</h2>
            <div className="actions">
              <button id="wheelButton" className="btn" type="button" disabled={!poolTeams.length} onClick={() => setShowWheel(true)}>
                Spin wheel
              </button>
              <button id="importButton" className="btn" type="button" onClick={handleOpenImport}>
                Import clubs
              </button>
            </div>
          </div>
          <div className="panel-body list">
            <section>
              <h3>Peserta Liga</h3>
              {activeTeams.length ? (
                <div className="list">
                  {activeTeams.map((team) => (
                    <div className="list-row" key={team.id}>
                      <div className="team-line">
                        <TeamBadge team={team} />
                        <div>
                          <div className="team-name">{team.name}</div>
                          <div className="muted">
                            {team.shortName} · owner: {players.find((player) => player.id === team.ownerId)?.name ?? team.owner ?? 'unassigned'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge status="active" />
                        <button className="btn btn-xs danger" type="button" onClick={() => unassignTeam(team.id)}>
                          Unassign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No active teams yet. Spin the wheel to add participants.</div>
              )}
            </section>
            <section>
              <h3>Pool Referensi</h3>
              {poolTeams.length ? (
                <div className="list">
                  {poolTeams.map((team) => {
                    const isAssigning = assigningTeamId === team.id;
                    return (
                      <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }} key={team.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="team-line">
                            <TeamBadge team={team} />
                            <div>
                              <div className="team-name">{team.name}</div>
                              <div className="muted">{team.shortName}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Badge status="pool" />
                            <button
                              className="btn btn-xs"
                              type="button"
                              onClick={() => {
                                setAssigningTeamId(isAssigning ? null : team.id);
                                setSelectedPlayerId('');
                                setNewPlayerName('');
                              }}
                            >
                              {isAssigning ? 'Cancel' : 'Assign'}
                            </button>
                            <button className="btn btn-xs danger" type="button" onClick={() => handleRemove(team.id, team.name)}>
                              Remove
                            </button>
                          </div>
                        </div>
                        {isAssigning ? (
                          <form className="list" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }} onSubmit={(event) => handleAssign(event, team.id)}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                              <div className="field" style={{ flex: 1, margin: 0 }}>
                                <label>Owner</label>
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
                                <div className="field" style={{ flex: 1, margin: 0 }}>
                                  <label>Nama player baru</label>
                                  <input
                                    value={newPlayerName}
                                    onChange={(event) => setNewPlayerName(event.target.value)}
                                    required
                                    placeholder="Nama player"
                                    autoFocus
                                  />
                                </div>
                              ) : null}
                              <button className="btn primary btn-xs" type="submit" style={{ marginBottom: 1 }}>
                                Assign
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">No pool teams. Add teams manually or import clubs.</div>
              )}
            </section>
          </div>
        </section>
        <section className="card">
          <h2>Add team</h2>
          <form id="teamForm" className="list" onSubmit={handleAddTeam}>
            <div className="field">
              <label>Name</label>
              <input name="name" required placeholder="Arsenal" />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Badge</label>
                <input name="badge" placeholder="ARS" />
              </div>
              <div className="field">
                <label>Short name</label>
                <input name="shortName" maxLength={3} placeholder="ARS" />
              </div>
            </div>
            <button className="btn primary" type="submit">
              Add team
            </button>
          </form>
        </section>
      </div>
      <SpinWheel leagueId={currentLeagueId} open={showWheel} onClose={() => setShowWheel(false)} onDone={refresh} />
      {showImport ? <ImportModal leagueId={currentLeagueId} onClose={() => setShowImport(false)} /> : null}
    </Shell>
  );
}

function ImportModal({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const allTeams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const [competitionId, setCompetitionId] = useState(COMPETITIONS[0].id);
  const [search, setSearch] = useState('');
  const [clubs, setClubs] = useState<ClubFromApi[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === leagueId), [allTeams, leagueId]);
  const poolIds = useMemo(() => new Set(teams.filter((team) => team.externalId).map((team) => team.externalId)), [teams]);
  const filtered = useMemo(() => clubs.filter((club) => club.name.toLowerCase().includes(search.toLowerCase())), [clubs, search]);
  const importable = useMemo(() => filtered.filter((club) => !poolIds.has(club.id)), [filtered, poolIds]);

  async function loadCompetition(nextCompetitionId = competitionId) {
    setLoading(true);
    setError('');
    try {
      const data = await fetchClubs(nextCompetitionId);
      setClubs(data);
      setSelectedIds(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load clubs.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  }

  function handleAddSelected() {
    selectedIds.forEach((id) => {
      const club = clubs.find((candidate) => candidate.id === id);
      if (!club) return;
      addTeam({
        leagueId,
        name: club.name,
        shortName: club.shortName,
        badge: club.logo || club.shortName,
        owner: null,
        status: 'pool',
        externalId: club.id,
      });
    });
    onClose();
  }

  return (
    <div className="modal open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h2>Import clubs</h2>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body list">
          <div className="form-grid">
            <div className="field">
              <label>Competition</label>
              <select
                id="competition"
                value={competitionId}
                onChange={(event) => {
                  setCompetitionId(event.target.value);
                  loadCompetition(event.target.value);
                }}
              >
                {COMPETITIONS.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} - {item.country}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Search</label>
              <input id="clubSearch" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Club name" />
            </div>
          </div>
          <div id="clubActions">
            {clubs.length ? (
              <button className="btn" type="button" style={{ marginBottom: 8 }} onClick={() => setSelectedIds(new Set(importable.map((club) => club.id)))}>
                Select all visible
              </button>
            ) : (
              <button className="btn primary" type="button" onClick={() => loadCompetition()}>
                Load clubs
              </button>
            )}
          </div>
          <div id="clubList" className="list" style={{ paddingBottom: selectedIds.size > 0 ? 56 : undefined }}>
            {loading ? <div className="empty">Loading clubs...</div> : null}
            {error ? (
              <div className="empty">
                Failed to load: {error}
                <button className="btn" type="button" onClick={() => loadCompetition()}>
                  Retry
                </button>
              </div>
            ) : null}
            {!loading && !error && filtered.length === 0 && clubs.length > 0 ? <div className="empty">No clubs match your search.</div> : null}
            {!loading && !error && filtered.length > 0 && importable.length === 0 ? <div className="empty">All clubs already in your pool.</div> : null}
            {!loading && !error ? filtered.map((club) => {
              const inPool = poolIds.has(club.id);
              const checked = selectedIds.has(club.id);
              return (
                <label className={`list-row${inPool ? ' muted' : ''}`} style={inPool ? { opacity: 0.45, pointerEvents: 'none' } : undefined} key={club.id}>
                  <input style={{ width: 'auto' }} type="checkbox" name="club" value={club.id} checked={checked} disabled={inPool} onChange={(event) => toggleSelected(club.id, event.target.checked)} />
                  <span className="team-line">
                    {club.logo ? (
                      <span className="team-badge">
                        <img src={club.logo} alt="" />
                      </span>
                    ) : (
                      <span className="team-badge">{club.shortName}</span>
                    )}
                    <span>{club.name}</span>
                  </span>
                  {inPool ? <span className="badge badge-pool">In pool</span> : null}
                </label>
              );
            }) : null}
          </div>
          <div id="importFooter" className="import-footer" style={{ display: selectedIds.size > 0 ? 'block' : 'none', position: 'sticky', bottom: 0, background: 'var(--panel)', paddingTop: 12 }}>
            <button id="addSelected" className="btn primary" type="button" onClick={handleAddSelected}>
              Add {selectedIds.size} selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
