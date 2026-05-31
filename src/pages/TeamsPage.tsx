import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { ImportClubGrid } from '../components/ImportClubGrid';
import { Shell } from '../components/Shell';
import { SpinWheel } from '../components/SpinWheel';
import { TeamBadge } from '../components/TeamBadge';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import { canAssignPlayerToLeague, getAssignablePlayersForLeague } from '../lib/playerAssignment';
import { saveCache, saveClubTier, deleteClubTier, getClubTiers } from '../lib/storage';
import type { ClubFromApi, Team } from '../lib/types';
import { useAuthStore } from '../store/useAuthStore';
import { useLeagueStore } from '../store/useLeagueStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';

export function TeamsPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const league = useLeagueStore((s) => s.leagues.find((item) => item.id === leagueId));
  const allTeams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const removeTeam = useTeamStore((s) => s.removeTeam);
  const removeTeams = useTeamStore((s) => s.removeTeams);
  const unassignTeam = useTeamStore((s) => s.unassignTeam);
  const refresh = useTeamStore((s) => s.refresh);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const players = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const fetchPlayers = usePlayerStore((s) => s.fetchPlayers);
  const fetchLeagues = useLeagueStore((s) => s.fetchLeagues);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showWheel, setShowWheel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());
  const currentLeagueId = leagueId || '';
  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === currentLeagueId), [allTeams, currentLeagueId]);
  const activeTeams = useMemo(() => teams.filter((team) => team.status === 'active'), [teams]);
  const poolTeams = useMemo(() => teams.filter((team) => (team.status || 'pool') === 'pool'), [teams]);
  const assignablePlayers = useMemo(() => getAssignablePlayersForLeague(players, allTeams, currentLeagueId), [players, allTeams, currentLeagueId]);

  useEffect(() => {
    fetchLeagues();
    fetchTeams();
    fetchPlayers();
  }, [fetchLeagues, fetchTeams, fetchPlayers]);

  if (!league || !leagueId) {
    return (
      <Shell active="leagues" title="Teams">
        <div className="empty">League not found.</div>
      </Shell>
    );
  }

  async function handleAddTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const shortName = String(data.get('shortName')).trim();
    await addTeam({
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

  async function handleAssign(event: React.FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team) return;
    const trimmedNewPlayerName = newPlayerName.trim();
    if (selectedPlayerId === '__new__' && !trimmedNewPlayerName) return;
    if (selectedPlayerId !== '__new__' && !canAssignPlayerToLeague(selectedPlayerId, allTeams, currentLeagueId)) return;
    const player = selectedPlayerId === '__new__'
      ? await addPlayer({ name: trimmedNewPlayerName, createdAt: new Date().toISOString() })
      : assignablePlayers.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return;
    await updateTeam({ ...team, ownerId: player.id, owner: player.name, status: 'active' });
    setAssigningTeamId(null);
    setSelectedPlayerId('');
    setNewPlayerName('');
  }

  async function handleRemove(teamId: string, name: string) {
    if (!confirm(`Remove "${name}" from league?`)) return;
    await removeTeam(teamId);
  }

  function togglePoolSelection(teamId: string) {
    setSelectedPoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedPoolIds((prev) => {
      if (prev.size === poolTeams.length) return new Set();
      return new Set(poolTeams.map((t) => t.id));
    });
  }

  async function handleBulkDelete() {
    const count = selectedPoolIds.size;
    if (!confirm(`Delete ${count} team${count > 1 ? 's' : ''} from pool?`)) return;
    await removeTeams(Array.from(selectedPoolIds));
    setSelectedPoolIds(new Set());
  }

  function handleOpenImport() {
    setShowImport(true);
  }

  function handleRefreshCache() {
    saveCache({});
  }

  return (
    <Shell active="leagues" title={`Teams - ${league.name}`} actions={<Link className="btn" to={`/league/${league.id}`}>Back</Link>}>
      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Teams</h2>
            {isAdmin ? (
              <div className="actions">
                <button id="wheelButton" className="btn" type="button" disabled={!poolTeams.length} onClick={() => setShowWheel(true)}>
                  Spin wheel
                </button>
                <button id="importButton" className="btn" type="button" onClick={handleOpenImport}>
                  Import clubs
                </button>
                <button className="btn" type="button" onClick={handleRefreshCache}>
                  Refresh cache
                </button>
              </div>
            ) : null}
          </div>
          <div className="panel-body list">
            <section>
              <h3>Peserta Liga</h3>
              {activeTeams.length ? (
                <div className="list">
                  {activeTeams.map((team) => (
                    <div className="list-row participant-row" key={team.id}>
                      <div className="team-line">
                        <TeamBadge team={team} />
                        <div>
                          <div className="team-name">{team.name}</div>
                          <div className="muted">
                            {team.shortName} · owner: {players.find((player) => player.id === team.ownerId)?.name ?? team.owner ?? 'unassigned'}
                          </div>
                        </div>
                      </div>
                      <div className="participant-actions">
                        <Badge status="active" />
                        {isAdmin ? (
                          <button className="btn btn-xs danger" type="button" onClick={() => unassignTeam(team.id)}>
                            Unassign
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No active teams yet. Spin the wheel to add participants.</div>
              )}
            </section>
            <section>
              <h3>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 400, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={poolTeams.length > 0 && selectedPoolIds.size === poolTeams.length}
                      onChange={toggleSelectAll}
                      disabled={!poolTeams.length}
                      style={{ width: 14, height: 14 }}
                    />
                    Select all
                  </label>
                  <span>Pool Referensi</span>
                  {selectedPoolIds.size > 0 ? (
                    <button className="btn btn-xs danger" type="button" onClick={handleBulkDelete}>
                      Delete {selectedPoolIds.size} selected
                    </button>
                  ) : null}
                </span>
              </h3>
              {poolTeams.length ? (
                <div className="list">
                  {poolTeams.map((team) => {
                    const isAssigning = assigningTeamId === team.id;
                    return (
                      <div className="list-row pool-row" key={team.id}>
                        <div className="pool-row-main">
                          <div className="team-line">
                            <input
                              type="checkbox"
                              checked={selectedPoolIds.has(team.id)}
                              onChange={() => togglePoolSelection(team.id)}
                              style={{ width: 14, height: 14, flexShrink: 0 }}
                            />
                            <TeamBadge team={team} />
                            <div>
                              <div className="team-name">{team.name}</div>
                              <div className="muted">{team.shortName}</div>
                            </div>
                          </div>
                          {selectedPoolIds.size === 0 ? (
                            <div className="pool-actions">
                              <TierBadge team={team} isAdmin={isAdmin} updateTeam={updateTeam} />
                              <Badge status="pool" />
                              {isAdmin ? (
                                <>
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
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {isAssigning && selectedPoolIds.size === 0 ? (
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
        {isAdmin ? (
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
        ) : null}
      </div>
      {isAdmin ? <SpinWheel leagueId={currentLeagueId} open={showWheel} onClose={() => setShowWheel(false)} onDone={refresh} /> : null}
      {isAdmin && showImport ? <ImportModal leagueId={currentLeagueId} onClose={() => setShowImport(false)} /> : null}
    </Shell>
  );
}

const TIER_OPTIONS: { value: 'elite' | 'mid' | 'underdog' | null; label: string; className: string }[] = [
  { value: 'elite', label: 'Elite', className: 'danger' },
  { value: 'mid', label: 'Mid', className: '' },
  { value: 'underdog', label: 'Underdog', className: 'success' },
  { value: null, label: 'None', className: '' },
];

function TierBadge({ team, isAdmin, updateTeam }: { team: Team; isAdmin: boolean; updateTeam: (t: Team) => Promise<Team> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tier = team.tier || 'mid';
  const tierLabels: Record<string, string> = { elite: 'Elite', mid: 'Mid', underdog: 'Underdog' };
  const tierClasses: Record<string, string> = { elite: 'danger', mid: '', underdog: 'success' };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function selectTier(nextTier: 'elite' | 'mid' | 'underdog' | null) {
    setOpen(false);
    if (!isAdmin) return;
    await updateTeam({ ...team, tier: nextTier });
    if (team.externalId) {
      if (nextTier) {
        await saveClubTier({ externalId: team.externalId, tier: nextTier });
      } else {
        await deleteClubTier(team.externalId);
      }
    }
  }

  return (
    <span className="tier-badge-wrapper" ref={ref}>
      <span
        className={`badge tier-trigger ${tierClasses[tier] || ''}`}
        onClick={isAdmin ? () => setOpen(!open) : undefined}
        title={isAdmin ? 'Klik untuk ubah tier' : undefined}
        style={isAdmin ? { cursor: 'pointer' } : undefined}
        role={isAdmin ? 'button' : undefined}
        tabIndex={isAdmin ? 0 : undefined}
        onKeyDown={isAdmin ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } } : undefined}
      >
        {tierLabels[tier] || tier}
        {isAdmin && <span className="tier-chevron" aria-hidden>▾</span>}
      </span>
      {open && (
        <div className="tier-popover" role="menu">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`tier-option ${opt.className}`}
              role="menuitem"
              type="button"
              onClick={() => selectTier(opt.value)}
            >
              <span className={`badge tier-option-badge ${opt.className}`}>{opt.label}</span>
              {opt.value === (team.tier ?? null) && (
                <span className="tier-check" aria-label="selected">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function ImportModal({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const allTeams = useTeamStore((s) => s.teams);
  const addTeam = useTeamStore((s) => s.addTeam);
  const [competitionId, setCompetitionId] = useState(COMPETITIONS[0].code);
  const [clubs, setClubs] = useState<ClubFromApi[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === leagueId), [allTeams, leagueId]);
  const poolIds = useMemo(() => new Set(teams.map((team) => team.externalId).filter((id): id is string => Boolean(id))), [teams]);
  const importable = useMemo(() => clubs.filter((club) => !poolIds.has(club.id)), [clubs, poolIds]);

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

  async function handleAddSelected() {
    const ids = Array.from(selectedIds);
    const clubTiers = await getClubTiers(ids);
    const tierMap = new Map(clubTiers.map((ct) => [ct.externalId, ct.tier]));
    await Promise.all(ids.map((id) => {
      const club = clubs.find((candidate) => candidate.id === id);
      if (!club) return Promise.resolve(null);
      return addTeam({
        leagueId,
        name: club.name,
        shortName: club.shortName,
        badge: club.logo || club.shortName,
        owner: null,
        status: 'pool',
        externalId: club.id,
        tier: tierMap.get(club.id) ?? null,
      });
    }));
    onClose();
  }

  return (
    <div className="modal open" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card import-modal-card">
        <div className="modal-head">
          <h2>Import clubs</h2>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body list">
          <div className="tabs" role="tablist" aria-label="Kompetisi">
            {COMPETITIONS.map((item) => (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={competitionId === item.code}
                className={competitionId === item.code ? 'tab active' : 'tab'}
                onClick={() => {
                  setCompetitionId(item.code);
                  loadCompetition(item.code);
                }}
              >
                {item.name}
              </button>
            ))}
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
          <div id="clubList" style={{ paddingBottom: selectedIds.size > 0 ? 56 : undefined }}>
            <ImportClubGrid
              clubs={clubs}
              selectedIds={selectedIds}
              poolIds={poolIds}
              loading={loading}
              error={error}
              onToggle={(id) => toggleSelected(id, !selectedIds.has(id))}
              onRetry={() => loadCompetition()}
            />
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
