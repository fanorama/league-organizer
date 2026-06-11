import { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { ImportClubGrid } from '../components/ImportClubGrid';
import { Shell } from '../components/Shell';
import { SpinWheel } from '../components/SpinWheel';
import { TeamBadge } from '../components/TeamBadge';
import { COMPETITIONS, fetchClubs } from '../lib/api';
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
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const removeTeam = useTeamStore((s) => s.removeTeam);
  const removeTeams = useTeamStore((s) => s.removeTeams);
  const unassignTeam = useTeamStore((s) => s.unassignTeam);
  const reorderTeams = useTeamStore((s) => s.reorderTeams);
  const refresh = useTeamStore((s) => s.refresh);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const players = usePlayerStore((s) => s.players);
  const fetchPlayers = usePlayerStore((s) => s.fetchPlayers);
  const fetchLeagues = useLeagueStore((s) => s.fetchLeagues);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [showWheel, setShowWheel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(new Set());
  const currentLeagueId = leagueId || '';
  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === currentLeagueId), [allTeams, currentLeagueId]);
  const activeTeams = useMemo(() => teams.filter((team) => team.status === 'active'), [teams]);
  const poolTeams = useMemo(() => teams.filter((team) => (team.status || 'pool') === 'pool'), [teams]);
  const readyTeams = useMemo(() => teams.filter((team) => team.status === 'ready'), [teams]);

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

  async function handleRemove(teamId: string, name: string) {
    if (!confirm(`Remove "${name}" from league?`)) return;
    const removed = await removeTeam(teamId);
    if (!removed) {
      alert(`Tim ini memiliki riwayat pertandingan dan tidak dapat dihapus.`);
    }
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
    const blocked = await removeTeams(Array.from(selectedPoolIds));
    setSelectedPoolIds(new Set());
    if (blocked.length > 0) {
      alert(`${blocked.length} tim memiliki riwayat pertandingan dan tidak dapat dihapus.`);
    }
  }

  function handleMoveToWheels(team: Team) {
    // Pindah ke Wheels, ditaruh di akhir daftar.
    reorderTeams([{ ...team, status: 'ready', sortOrder: readyTeams.length }]);
  }

  function handleOpenImport() {
    setShowImport(true);
  }

  function handleRefreshCache() {
    saveCache({});
  }

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const listFor = (droppableId: string) => (droppableId === 'pools' ? poolTeams : readyTeams);
    const statusFor = (droppableId: string): Team['status'] => (droppableId === 'pools' ? 'pool' : 'ready');
    // Beri ulang sortOrder berurutan 0..n untuk satu grup.
    const reindex = (list: Team[]) => list.map((team, index) => ({ ...team, sortOrder: index }));

    const sourceList = Array.from(listFor(source.droppableId));
    const [moved] = sourceList.splice(source.index, 1);
    if (!moved) return;

    if (source.droppableId === destination.droppableId) {
      sourceList.splice(destination.index, 0, moved);
      reorderTeams(reindex(sourceList));
      return;
    }

    const destList = Array.from(listFor(destination.droppableId));
    destList.splice(destination.index, 0, { ...moved, status: statusFor(destination.droppableId) });
    reorderTeams([...reindex(sourceList), ...reindex(destList)]);
  }

  return (
    <Shell active="leagues" title={`Teams - ${league.name}`} actions={<Link className="btn" to={`/league/${league.id}`}>Back</Link>}>
      <div>
        <section className="panel">
          <div className="panel-head">
            <h2>Teams</h2>
            {isAdmin ? (
              <div className="actions">
                <button id="wheelButton" className="btn" type="button" disabled={!readyTeams.length} onClick={() => setShowWheel(true)}>
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
                  {isAdmin ? (
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
                  ) : null}
                  <span>Pools & Wheels</span>
                  {isAdmin && selectedPoolIds.size > 0 ? (
                    <button className="btn btn-xs danger" type="button" onClick={handleBulkDelete}>
                      Delete {selectedPoolIds.size} selected
                    </button>
                  ) : null}
                </span>
              </h3>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="pools-wheels-grid">
                  <Droppable droppableId="pools">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`drop-zone${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}>
                        <div className="drop-zone-head">Pools ({poolTeams.length})</div>
                        <div className="list">
                          {poolTeams.map((team, index) => (
                            <Draggable key={team.id} draggableId={team.id} index={index} isDragDisabled={!isAdmin}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`list-row pool-row${snap.isDragging ? ' is-dragging' : ''}`}>
                                  <div className="pool-row-main">
                                    <div className="team-line">
                                      {isAdmin ? (
                                        <input
                                          type="checkbox"
                                          checked={selectedPoolIds.has(team.id)}
                                          onChange={() => togglePoolSelection(team.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ width: 14, height: 14, flexShrink: 0 }}
                                        />
                                      ) : null}
                                      <TeamBadge team={team} />
                                      <div>
                                        <div className="team-name">{team.name}</div>
                                        <div className="muted">{team.shortName}</div>
                                      </div>
                                    </div>
                                    <div className="pool-actions">
                                      <TierBadge team={team} isAdmin={isAdmin} updateTeam={updateTeam} />
                                      <Badge status="pool" />
                                      {isAdmin ? (
                                        <button className="btn btn-xs danger" type="button" onClick={() => handleRemove(team.id, team.name)}>
                                          Remove
                                        </button>
                                      ) : null}
                                      {isAdmin ? (
                                        <button
                                          className="btn btn-xs move-to-wheels"
                                          type="button"
                                          title="Pindahkan ke Wheels"
                                          aria-label="Pindahkan ke Wheels"
                                          onClick={() => handleMoveToWheels(team)}
                                        >
                                          →
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!poolTeams.length && <div className="empty">Kosong</div>}
                        </div>
                      </div>
                    )}
                  </Droppable>
                  <Droppable droppableId="wheels">
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`drop-zone${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}>
                        <div className="drop-zone-head">Wheels ({readyTeams.length})</div>
                        <div className="list">
                          {readyTeams.map((team, index) => (
                            <Draggable key={team.id} draggableId={team.id} index={index} isDragDisabled={!isAdmin}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`list-row pool-row${snap.isDragging ? ' is-dragging' : ''}`}>
                                  <div className="pool-row-main">
                                    <div className="team-line">
                                      <TeamBadge team={team} />
                                      <div>
                                        <div className="team-name">{team.name}</div>
                                        <div className="muted">{team.shortName}</div>
                                      </div>
                                    </div>
                                    <div className="pool-actions">
                                      <TierBadge team={team} isAdmin={isAdmin} updateTeam={updateTeam} />
                                      <Badge status="ready" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!readyTeams.length && <div className="empty">Kosong</div>}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            </section>
          </div>
        </section>
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
