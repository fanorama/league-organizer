import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { CompetitionClubPoolModal } from '../components/CompetitionClubPoolModal';
import { DrawWheel, type DrawWheelHandle, type DrawWheelItem } from '../components/DrawWheel';
import { Shell } from '../components/Shell';
import { pickWeightedClub } from '../lib/balancedDraw';
import { computeGroupStandings, rankBestThirds } from '../lib/competition';
import type { SkillTier } from '../lib/playerSkill';
import { useAuthStore } from '../store/useAuthStore';
import { useCompetitionStore } from '../store/useCompetitionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';
import type { Competition, CompetitionClub, CompetitionMatch, CompetitionParticipant, CompetitionSettings, GroupDef, QualifyMode, Team } from '../lib/types';

type TabName = 'setup' | 'draw' | 'group' | 'knockout' | 'champion';

const TAB_LABELS: Record<TabName, string> = {
  setup: 'Setup',
  draw: 'Undian',
  group: 'Grup',
  knockout: 'Knockout',
  champion: 'Juara',
};

function defaultTab(status: Competition['status']): TabName {
  switch (status) {
    case 'setup': return 'setup';
    case 'draw_clubs':
    case 'group_draw': return 'draw';
    case 'group_stage': return 'group';
    case 'knockout': return 'knockout';
    case 'finished': return 'champion';
    default: return 'setup';
  }
}

function teamLogo(team: Team): string | undefined {
  const value = team.logo || team.badge;
  return value && /^(https?:\/\/|\/|data:)/.test(value) ? value : undefined;
}

/** Agregat skor dua leg untuk team1/team2 (null bila bukan two-legged). */
function tieAggregate(team1: string, team2: string, tieMatches: CompetitionMatch[]): { a: number; b: number } | null {
  const finished = tieMatches.filter((m) => m.status === 'finished');
  if (finished.length < 2) return null;
  let a = 0;
  let b = 0;
  finished.forEach((m) => {
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (m.homeParticipantId === team1) a += hs;
    if (m.awayParticipantId === team1) a += as;
    if (m.homeParticipantId === team2) b += hs;
    if (m.awayParticipantId === team2) b += as;
  });
  return { a, b };
}

export function CompetitionPage() {
  const { id = '' } = useParams();
  const competition = useCompetitionStore((s) => s.competition);
  const participants = useCompetitionStore((s) => s.participants);
  const matches = useCompetitionStore((s) => s.matches);
  const loadCompetitionDetail = useCompetitionStore((s) => s.loadCompetitionDetail);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const fetchPlayers = usePlayerStore((s) => s.fetchPlayers);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);

  const [activeTab, setActiveTab] = useState<TabName>('setup');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompetitionDetail(id);
    fetchPlayers();
    fetchTeams();
  }, [id, loadCompetitionDetail, fetchPlayers, fetchTeams]);

  useEffect(() => {
    if (competition) setActiveTab(defaultTab(competition.status));
  }, [competition?.status]);

  if (!competition) {
    return (
      <Shell active="competitions" title="Competition">
        <div className="empty">Memuat…</div>
      </Shell>
    );
  }

  const participantName = (pid: string | null | undefined): string => {
    if (!pid) return '—';
    const p = participants.find((x) => x.id === pid);
    return p ? (p.clubName || p.playerId) : pid;
  };

  async function guarded(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const tabs: TabName[] = ['setup', 'draw', 'group', 'knockout', 'champion'];

  return (
    <Shell active="competitions" title={competition.name} actions={<Badge status={competition.status} />}>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {error ? <div className="empty" style={{ color: 'var(--danger, #e03050)' }}>{error}</div> : null}

      {activeTab === 'setup' ? (
        <SetupTab competition={competition} participants={participants} isAdmin={isAdmin} guarded={guarded} />
      ) : null}
      {activeTab === 'draw' ? (
        <DrawTab competition={competition} participants={participants} isAdmin={isAdmin} guarded={guarded} />
      ) : null}
      {activeTab === 'group' ? (
        <GroupTab competition={competition} participants={participants} matches={matches} isAdmin={isAdmin} guarded={guarded} participantName={participantName} />
      ) : null}
      {activeTab === 'knockout' ? (
        <KnockoutTab competition={competition} matches={matches} isAdmin={isAdmin} guarded={guarded} participantName={participantName} />
      ) : null}
      {activeTab === 'champion' ? (
        <ChampionTab competition={competition} participants={participants} />
      ) : null}
    </Shell>
  );
}

// ===== Setup tab =====

function SetupTab({ competition, participants, isAdmin, guarded }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
}) {
  const players = usePlayerStore((s) => s.players);
  const addParticipants = useCompetitionStore((s) => s.addParticipants);
  const removeParticipant = useCompetitionStore((s) => s.removeParticipant);
  const startClubDraw = useCompetitionStore((s) => s.startClubDraw);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const editable = isAdmin && competition.status === 'setup';

  const poolSize = competition.settings.clubPool?.length ?? 0;
  // Pool klub valid bila tak dibatasi (0 = semua) atau cukup untuk semua peserta.
  const poolTooSmall = poolSize > 0 && poolSize < participants.length;

  const available = useMemo(
    () => players.filter((p) => !participants.some((x) => x.playerId === p.id)),
    [players, participants],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? available.filter((p) => p.name.toLowerCase().includes(q)) : available;
  }, [available, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllFiltered() {
    const ids = filtered.map((p) => p.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }
  async function addSelected() {
    const ids = [...selected];
    await guarded(async () => {
      await addParticipants(competition.id, ids);
      setSelected(new Set());
      setQuery('');
    });
  }

  const filteredAllSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <>
      {editable ? (
        <>
          <SettingsEditor competition={competition} guarded={guarded} />
          <ClubPoolPicker competition={competition} guarded={guarded} />
        </>
      ) : (
        <SettingsSummary competition={competition} />
      )}
      <div className="setup-grid">
      <section className="card">
        <div className="setup-head">
          <h2>Peserta</h2>
          <span className="badge">{participants.length} terdaftar</span>
        </div>
        {participants.length ? (
          <div className="participant-chips">
            {participants.map((p) => {
              const player = players.find((x) => x.id === p.playerId);
              return (
                <div key={p.id} className="participant-chip">
                  <span className="participant-chip__name">{player?.name || p.playerId}</span>
                  {editable ? (
                    <button
                      className="participant-chip__remove"
                      type="button"
                      aria-label="Hapus peserta"
                      title="Hapus peserta"
                      onClick={() => guarded(() => removeParticipant(p.id))}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Belum ada peserta. Pilih pemain dari panel sebelah →</p>
        )}

        {editable ? (
          <button
            className="btn primary setup-start"
            type="button"
            disabled={participants.length < competition.settings.groupCount || poolTooSmall}
            onClick={() => guarded(() => startClubDraw(competition.id))}
          >
            Mulai undian klub
          </button>
        ) : null}
        {editable && participants.length < competition.settings.groupCount ? (
          <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Minimal {competition.settings.groupCount} peserta (sesuai jumlah grup).
          </p>
        ) : null}
        {editable && poolTooSmall ? (
          <p className="muted" style={{ marginTop: 6, fontSize: 12, color: 'var(--danger, #e03050)' }}>
            Pool klub ({poolSize}) lebih sedikit dari jumlah peserta ({participants.length}). Tambah klub atau kurangi peserta.
          </p>
        ) : null}
      </section>

      {editable ? (
        <section className="card">
          <div className="setup-head">
            <h2>Tambah pemain</h2>
            {selected.size ? <span className="badge success">{selected.size} dipilih</span> : null}
          </div>

          <input
            type="search"
            placeholder="Cari nama pemain…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%' }}
          />

          <div className="picker-toolbar">
            <button className="btn btn-xs" type="button" disabled={!filtered.length} onClick={toggleAllFiltered}>
              {filteredAllSelected ? 'Batalkan semua' : 'Pilih semua'}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>{filtered.length} tersedia</span>
          </div>

          <div className="picker-list">
            {filtered.map((p) => {
              const on = selected.has(p.id);
              return (
                <label key={p.id} className={`picker-item ${on ? 'picker-item--on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                  <span className="picker-item__name">{p.name}</span>
                </label>
              );
            })}
            {!filtered.length ? (
              <p className="muted" style={{ padding: 8 }}>
                {available.length ? 'Tidak ada pemain cocok.' : 'Semua pemain sudah jadi peserta.'}
              </p>
            ) : null}
          </div>

          <button
            className="btn primary setup-start"
            type="button"
            disabled={!selected.size}
            onClick={addSelected}
          >
            Tambah {selected.size || ''} pemain
          </button>
        </section>
      ) : null}
      </div>
    </>
  );
}

// ===== Setup: editor pengaturan kompetisi =====

const QUALIFY_LABELS: Record<QualifyMode, string> = {
  top1: 'Juara grup saja',
  top2: '2 teratas tiap grup',
  top2_plus_best_thirds: '2 teratas + best third',
};

function SettingsEditor({ competition, guarded }: {
  competition: Competition;
  guarded: (a: () => Promise<void>) => Promise<void>;
}) {
  const updateSettings = useCompetitionStore((s) => s.updateCompetitionSettings);
  const [draft, setDraft] = useState<CompetitionSettings>(competition.settings);
  const [saved, setSaved] = useState(false);

  // Sinkronkan draft bila settings di store berubah (mis. setelah reload).
  useEffect(() => { setDraft(competition.settings); }, [competition.settings]);

  function patch<K extends keyof CompetitionSettings>(key: K, value: CompetitionSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await guarded(async () => {
      const next: Partial<CompetitionSettings> = {
        groupCount: draft.groupCount,
        potCount: draft.potCount,
        meetingsPerPair: draft.meetingsPerPair === 2 ? 2 : 1,
        qualifyMode: draft.qualifyMode,
        knockoutLegs: draft.knockoutLegs === 2 ? 2 : 1,
        bestThirdsCount: draft.qualifyMode === 'top2_plus_best_thirds' ? draft.bestThirdsCount : undefined,
      };
      await updateSettings(competition.id, next);
      setSaved(true);
    });
  }

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="setup-head">
        <h2>Pengaturan kompetisi</h2>
        {saved ? <span className="badge success">Tersimpan</span> : null}
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Jumlah grup</label>
          <input type="number" min={1} value={draft.groupCount}
            onChange={(e) => patch('groupCount', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Jumlah pot</label>
          <input type="number" min={1} value={draft.potCount}
            onChange={(e) => patch('potCount', Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Pertemuan per pasangan</label>
          <select value={String(draft.meetingsPerPair)}
            onChange={(e) => patch('meetingsPerPair', Number(e.target.value) === 2 ? 2 : 1)}>
            <option value="1">Sekali</option>
            <option value="2">Kandang & tandang</option>
          </select>
        </div>
        <div className="field">
          <label>Mode kualifikasi</label>
          <select value={draft.qualifyMode}
            onChange={(e) => patch('qualifyMode', e.target.value as QualifyMode)}>
            <option value="top1">Juara grup saja</option>
            <option value="top2">2 teratas tiap grup</option>
            <option value="top2_plus_best_thirds">2 teratas + best third</option>
          </select>
        </div>
        {draft.qualifyMode === 'top2_plus_best_thirds' ? (
          <div className="field">
            <label>Jumlah best third</label>
            <input type="number" min={1} value={draft.bestThirdsCount ?? 0}
              onChange={(e) => patch('bestThirdsCount', Number(e.target.value))} />
          </div>
        ) : null}
        <div className="field">
          <label>Leg knockout</label>
          <select value={String(draft.knockoutLegs)}
            onChange={(e) => patch('knockoutLegs', Number(e.target.value) === 2 ? 2 : 1)}>
            <option value="1">1 leg</option>
            <option value="2">2 leg (agregat)</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button className="btn primary" type="button" onClick={save}>Simpan pengaturan</button>
        </div>
      </div>
    </section>
  );
}

function SettingsSummary({ competition }: { competition: Competition }) {
  const s = competition.settings;
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h2>Pengaturan kompetisi</h2>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="badge">{s.groupCount} grup</span>
        <span className="badge">{s.potCount} pot</span>
        <span className="badge">{s.meetingsPerPair === 2 ? 'Kandang & tandang' : 'Sekali'}</span>
        <span className="badge">{QUALIFY_LABELS[s.qualifyMode]}</span>
        {s.qualifyMode === 'top2_plus_best_thirds' ? <span className="badge">{s.bestThirdsCount} best third</span> : null}
        <span className="badge">{s.knockoutLegs} leg knockout</span>
        <span className="badge">{s.clubPool?.length ? `${s.clubPool.length} klub di pool` : 'Semua klub'}</span>
      </div>
    </section>
  );
}

// ===== Setup: pemilihan pool klub untuk wheel =====

function ClubPoolPicker({ competition, guarded }: {
  competition: Competition;
  guarded: (a: () => Promise<void>) => Promise<void>;
}) {
  const updateSettings = useCompetitionStore((s) => s.updateCompetitionSettings);
  const [open, setOpen] = useState(false);
  const pool = competition.settings.clubPool ?? [];

  async function handleConfirm(clubs: CompetitionClub[]) {
    await guarded(async () => {
      await updateSettings(competition.id, { clubPool: clubs });
      setOpen(false);
    });
  }

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="setup-head">
        <h2>Pool klub wheel</h2>
        <span className="badge">{pool.length ? `${pool.length} klub dipilih` : 'Semua klub global'}</span>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 12 }}>
        Pilih klub dari berbagai liga yang boleh masuk undian. Bila kosong, seluruh tim global dipakai.
      </p>

      {pool.length ? (
        <div className="participant-chips" style={{ marginBottom: 12 }}>
          {pool.map((c) => (
            <div key={c.externalId} className="participant-chip">
              {c.logo ? <img src={c.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} /> : null}
              <span className="participant-chip__name">{c.name}</span>
            </div>
          ))}
        </div>
      ) : null}

      <button className="btn primary" type="button" onClick={() => setOpen(true)}>
        {pool.length ? 'Ubah pilihan klub' : 'Pilih klub'}
      </button>

      {open ? (
        <CompetitionClubPoolModal
          initialSelected={pool}
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

// ===== Draw tab (undian klub + draw grup) =====

function DrawTab({ competition, participants, isAdmin, guarded }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
}) {
  const players = usePlayerStore((s) => s.players);
  const teams = useTeamStore((s) => s.teams);
  const assignClubToParticipant = useCompetitionStore((s) => s.assignClubToParticipant);
  const resetClubDraw = useCompetitionStore((s) => s.resetClubDraw);
  const finishClubDraw = useCompetitionStore((s) => s.finishClubDraw);
  const runGroupDraw = useCompetitionStore((s) => s.runGroupDraw);

  const leftRef = useRef<DrawWheelHandle>(null);
  const rightRef = useRef<DrawWheelHandle>(null);
  const [busy, setBusy] = useState(false);

  const playerName = (pid: string): string => players.find((x) => x.id === pid)?.name || pid;

  // Pool klub: bila settings.clubPool diisi, pakai snapshot klub terpilih
  // (sumber API football-data, tanpa tier → default 'mid'); kosong = tim global.
  function buildPool(parts: CompetitionParticipant[]): Team[] {
    const used = new Set(parts.map((p) => p.clubExternalId).filter(Boolean));
    const selected = competition.settings.clubPool;
    if (selected?.length) {
      return selected
        .filter((c) => !used.has(c.externalId))
        .map((c) => ({
          id: c.externalId,
          leagueId: '',
          name: c.name,
          logo: c.logo ?? undefined,
          status: 'pool',
          tier: null,
          externalId: c.externalId,
        }));
    }
    return teams.filter((t) => t.externalId && !used.has(t.externalId));
  }

  const unassigned = useMemo(() => participants.filter((p) => !p.clubName), [participants]);
  const pool = useMemo(() => buildPool(participants), [participants, teams]);

  const leftItems: DrawWheelItem[] = unassigned.map((p) => ({ id: p.id, label: playerName(p.playerId) }));
  const rightItems: DrawWheelItem[] = pool.map((c) => ({ id: c.externalId as string, label: c.name, logo: teamLogo(c) ?? null }));

  /** Satu putaran: kiri pilih peserta, kanan klub berbobot skill, lalu pasangkan. */
  async function drawOne(parts: CompetitionParticipant[]): Promise<boolean> {
    const remaining = parts.filter((p) => !p.clubName);
    const poolNow = buildPool(parts);
    if (!remaining.length || !poolNow.length) return false;

    const pIdx = Math.floor(Math.random() * remaining.length);
    const participant = remaining[pIdx];
    const skill: SkillTier = players.find((x) => x.id === participant.playerId)?.skillOverride ?? 'sedang';
    const club = pickWeightedClub(poolNow, skill);
    if (!club) return false;
    const cIdx = poolNow.findIndex((c) => c.externalId === club.externalId);

    await Promise.all([leftRef.current?.spinTo(pIdx), rightRef.current?.spinTo(cIdx)]);
    await assignClubToParticipant(
      participant.id,
      { externalId: club.externalId, name: club.name, logo: teamLogo(club) ?? null },
      (club.tier ?? 'mid') as 'elite' | 'mid' | 'underdog',
    );
    return true;
  }

  async function spinOnce() {
    if (busy) return;
    setBusy(true);
    await guarded(async () => { await drawOne(participants); });
    setBusy(false);
  }

  async function spinAll() {
    if (busy) return;
    setBusy(true);
    await guarded(async () => {
      // Setiap iterasi baca state terbaru dari store, beri jeda agar wheel re-render.
      for (let guard = 0; guard < 200; guard += 1) {
        const fresh = useCompetitionStore.getState().participants;
        const ok = await drawOne(fresh);
        if (!ok) break;
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    setBusy(false);
  }

  const allAssigned = participants.length > 0 && participants.every((p) => p.clubName);
  const canDrawClubs = isAdmin && competition.status === 'draw_clubs';
  const canDrawGroups = isAdmin && competition.status === 'group_draw';

  return (
    <>
      <section className="card">
        <div className="setup-head">
          <h2>Undian klub</h2>
          <span className="badge">{participants.filter((p) => p.clubName).length}/{participants.length} terundi</span>
        </div>

        {canDrawClubs ? (
          <>
            <div className="draw-wheels-row">
              <DrawWheel ref={leftRef} title="Pemain" items={leftItems} />
              <div className="draw-wheels-vs">VS</div>
              <DrawWheel ref={rightRef} title="Klub" items={rightItems} />
            </div>
            <div className="draw-controls">
              <button className="btn primary" type="button" disabled={busy || allAssigned} onClick={spinOnce}>
                {busy ? 'Memutar…' : 'Putar'}
              </button>
              <button className="btn" type="button" disabled={busy || allAssigned} onClick={spinAll}>
                Putar semua otomatis
              </button>
              <button
                className="btn danger"
                type="button"
                disabled={busy || !participants.some((p) => p.clubName)}
                onClick={() => guarded(() => resetClubDraw(competition.id))}
              >
                Reset undian
              </button>
            </div>
          </>
        ) : null}

        <div className="participant-chips" style={{ marginTop: 16 }}>
          {participants.map((p) => (
            <div key={p.id} className="participant-chip">
              <span className="participant-chip__name">{playerName(p.playerId)}</span>
              {p.clubName ? (
                <span className="badge success">{p.clubName}</span>
              ) : (
                <span className="badge">—</span>
              )}
            </div>
          ))}
        </div>

        {canDrawClubs ? (
          <button
            className="btn primary"
            type="button"
            style={{ marginTop: 14 }}
            disabled={!allAssigned || busy}
            onClick={() => guarded(() => finishClubDraw(competition.id))}
          >
            Selesai undian klub
          </button>
        ) : null}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Undian grup</h2>
        {competition.groups?.length ? (
          <GroupComposition groups={competition.groups} participants={participants} />
        ) : (
          <p className="muted">Grup belum diundi.</p>
        )}
        {canDrawGroups ? (
          <button className="btn primary" type="button" style={{ marginTop: 12 }} onClick={() => guarded(() => runGroupDraw(competition.id))}>
            Undi grup
          </button>
        ) : null}
      </section>
    </>
  );
}

function GroupComposition({ groups, participants }: { groups: GroupDef[]; participants: CompetitionParticipant[] }) {
  return (
    <div className="group-draw-grid">
      {groups.map((g) => (
        <div className="group-card" key={g.key}>
          <div className="group-card__head">
            <span className="group-card__badge">{g.key}</span>
            <span className="group-card__title">Grup {g.key}</span>
            <span className="group-card__count">{g.participantIds.length} tim</span>
          </div>
          <ol className="group-card__list">
            {g.participantIds.map((pid, i) => {
              const p = participants.find((x) => x.id === pid);
              return (
                <li className="group-card__row" key={pid}>
                  <span className="group-card__seed">{i + 1}</span>
                  {p?.clubLogo ? (
                    <img className="group-card__logo" src={p.clubLogo} alt="" loading="lazy" />
                  ) : (
                    <span className="group-card__logo group-card__logo--empty" aria-hidden>⚽</span>
                  )}
                  <span className="group-card__club">{p?.clubName || pid}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

// ===== Group tab (klasemen + input skor) =====

function GroupTab({ competition, participants, matches, isAdmin, guarded, participantName }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  matches: CompetitionMatch[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
}) {
  const saveGroupResult = useCompetitionStore((s) => s.saveGroupResult);
  const startKnockout = useCompetitionStore((s) => s.startKnockout);
  const groups = competition.groups ?? [];
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const allFinished = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'finished');
  // Skor grup hanya bisa diedit selama fase grup; setelah knockout dimulai,
  // klasemen dibekukan agar tidak desync dengan bracket yang sudah di-seed.
  const scoreEditable = isAdmin && competition.status === 'group_stage';

  const allStandings = groups.map((g) => computeGroupStandings(g, participants, matches));
  const qualifiedThirds = competition.settings.qualifyMode === 'top2_plus_best_thirds'
    ? new Set(rankBestThirds(allStandings, competition.settings.bestThirdsCount ?? 0))
    : new Set<string>();

  function qualifyBadge(rank: number, participantId: string): string | null {
    const mode = competition.settings.qualifyMode;
    if (rank === 1) return 'lolos';
    if (rank === 2 && (mode === 'top2' || mode === 'top2_plus_best_thirds')) return 'lolos';
    if (rank === 3 && qualifiedThirds.has(participantId)) return 'best 3rd';
    return null;
  }

  return (
    <>
      {groups.map((g, gi) => (
        <section className="card" key={g.key} style={{ marginTop: gi ? 18 : 0 }}>
          <h2>Grup {g.key}</h2>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Klub</th><th>M</th><th>SG</th><th>Poin</th><th></th></tr>
            </thead>
            <tbody>
              {allStandings[gi].map((row) => {
                const badge = qualifyBadge(row.rank, row.participantId);
                return (
                  <tr key={row.participantId}>
                    <td>{row.rank}</td>
                    <td>{participantName(row.participantId)}</td>
                    <td>{row.played}</td>
                    <td>{row.gd}</td>
                    <td>{row.pts}</td>
                    <td>{badge ? <span className="badge success">{badge}</span> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="list" style={{ marginTop: 12 }}>
            {groupMatches.filter((m) => m.groupKey === g.key).map((m) => (
              <MatchRow key={m.id} match={m} editable={scoreEditable} guarded={guarded} participantName={participantName} onSave={saveGroupResult} />
            ))}
          </ul>
        </section>
      ))}

      {isAdmin && competition.status === 'group_stage' ? (
        <button className="btn primary" type="button" style={{ marginTop: 18 }} disabled={!allFinished} onClick={() => guarded(() => startKnockout(competition.id))}>
          Mulai knockout
        </button>
      ) : null}
    </>
  );
}

function MatchRow({ match, editable, guarded, participantName, onSave }: {
  match: CompetitionMatch;
  editable: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
  onSave: (matchId: string, home: number, away: number) => Promise<void>;
}) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);

  return (
    <li className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
      <span style={{ flex: 1, textAlign: 'right' }}>{participantName(match.homeParticipantId)}</span>
      {editable ? (
        <>
          <input type="number" min={0} value={home} onChange={(e) => setHome(Number(e.target.value))} style={{ width: 48 }} />
          <span>-</span>
          <input type="number" min={0} value={away} onChange={(e) => setAway(Number(e.target.value))} style={{ width: 48 }} />
          <button className="btn btn-xs primary" type="button" onClick={() => guarded(() => onSave(match.id, home, away))}>
            Simpan
          </button>
        </>
      ) : (
        <span>{match.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : 'vs'}</span>
      )}
      <span style={{ flex: 1 }}>{participantName(match.awayParticipantId)}</span>
    </li>
  );
}

// ===== Knockout tab =====

function KnockoutTab({ competition, matches, isAdmin, guarded, participantName }: {
  competition: Competition;
  matches: CompetitionMatch[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
}) {
  const saveKnockoutResult = useCompetitionStore((s) => s.saveKnockoutResult);
  const resolveTie = useCompetitionStore((s) => s.resolveTie);
  const bracket = competition.bracket;
  // Skor knockout terkunci setelah turnamen selesai.
  const scoreEditable = isAdmin && competition.status === 'knockout';

  if (!bracket) return <div className="empty">Bracket belum dibuat.</div>;

  return (
    <>
      {bracket.warning ? <div className="empty" style={{ color: 'var(--warning, #f0b429)' }}>{bracket.warning}</div> : null}
      <div className="bracket-rounds-row">
        {bracket.rounds.map((round, ri) => (
          <div className="bracket-round-col" key={ri}>
            <div className="bracket-section-header">
              {ri === bracket.rounds.length - 1 ? 'Final' : `Babak ${ri + 1}`}
            </div>
            {round.map((tie, ti) => {
              const tieMatches = matches.filter((m) => m.stage === 'knockout' && m.round === ri && m.tieIndex === ti);
              const aggregate = tie.team1 && tie.team2 ? tieAggregate(tie.team1, tie.team2, tieMatches) : null;
              return (
                <div className="card" key={ti} style={{ marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{participantName(tie.team1)}</strong>
                    <span className="muted">vs</span>
                    <strong>{participantName(tie.team2)}</strong>
                  </div>
                  {tie.bye ? <p className="muted">Bye → lolos otomatis</p> : null}
                  {aggregate ? <p className="muted">Agregat: {aggregate.a} - {aggregate.b}</p> : null}
                  {tie.winner ? <p className="badge success">Pemenang: {participantName(tie.winner)}</p> : null}
                  <ul className="list">
                    {tieMatches.map((m) => (
                      <MatchRow key={m.id} match={m} editable={scoreEditable} guarded={guarded} participantName={participantName} onSave={saveKnockoutResult} />
                    ))}
                  </ul>
                  {isAdmin && !tie.winner && !tie.bye && tie.team1 && tie.team2 && tieMatches.length > 0 && tieMatches.every((m) => m.status === 'finished') ? (
                    <TieResolver tie1={tie.team1} tie2={tie.team2} participantName={participantName} onResolve={(winnerId) => guarded(() => resolveTie(competition.id, ri, ti, winnerId))} />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function TieResolver({ tie1, tie2, participantName, onResolve }: {
  tie1: string;
  tie2: string;
  participantName: (pid: string | null | undefined) => string;
  onResolve: (winnerId?: string) => Promise<void>;
}) {
  const [manual, setManual] = useState('');
  return (
    <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <button className="btn btn-xs" type="button" onClick={() => onResolve(undefined)}>
        Proses hasil
      </button>
      <span className="muted">atau jika agregat seri pilih pemenang:</span>
      <select value={manual} onChange={(e) => setManual(e.target.value)}>
        <option value="">--</option>
        <option value={tie1}>{participantName(tie1)}</option>
        <option value={tie2}>{participantName(tie2)}</option>
      </select>
      <button className="btn btn-xs primary" type="button" disabled={!manual} onClick={() => onResolve(manual)}>
        Tetapkan
      </button>
    </div>
  );
}

// ===== Champion tab =====

function ChampionTab({ competition, participants }: {
  competition: Competition;
  participants: CompetitionParticipant[];
}) {
  if (competition.status !== 'finished' || !competition.championId) {
    return <div className="empty">Juara belum ditentukan.</div>;
  }
  const champ = participants.find((p) => p.id === competition.championId);
  return (
    <section className="card" style={{ textAlign: 'center' }}>
      <h2>🏆 Juara</h2>
      <p style={{ fontSize: 24, fontWeight: 700 }}>{champ?.clubName || competition.championId}</p>
      {champ?.clubLogo ? <img src={champ.clubLogo} alt={champ.clubName ?? ''} style={{ width: 80, height: 80 }} /> : null}
    </section>
  );
}
