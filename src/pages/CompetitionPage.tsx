import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { CompetitionClubPoolModal } from '../components/CompetitionClubPoolModal';
import { DrawWheel, type DrawWheelHandle, type DrawWheelItem } from '../components/DrawWheel';
import { Shell } from '../components/Shell';
import { pickWeightedClub } from '../lib/balancedDraw';
import { buildGroupMatchdays, computeGroupStandings, rankBestThirds } from '../lib/competition';
import type { SkillTier } from '../lib/playerSkill';
import { useAuthStore } from '../store/useAuthStore';
import { useCompetitionStore } from '../store/useCompetitionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTeamStore } from '../store/useTeamStore';
import type { Competition, CompetitionClub, CompetitionMatch, CompetitionParticipant, CompetitionSettings, GroupDef, QualifyMode, Team } from '../lib/types';

type TabName = 'setup' | 'draw' | 'schedule' | 'group' | 'knockout' | 'champion';

const TAB_LABELS: Record<TabName, string> = {
  setup: 'Setup',
  draw: 'Undian',
  schedule: 'Jadwal',
  group: 'Grup',
  knockout: 'Knockout',
  champion: 'Juara',
};

/**
 * Susun match grup menjadi matchday (tiap matchday memuat semua grup).
 * Pakai settings.scheduleMatchdays bila ada; selain itu bangun default dari
 * struktur round-robin. `groupMatches` harus urutan pembuatan (createdAt).
 */
function getScheduleMatchdays(competition: Competition, groupMatches: CompetitionMatch[]): CompetitionMatch[][] {
  const byId = new Map(groupMatches.map((m) => [m.id, m]));
  const saved = competition.settings.scheduleMatchdays;
  let dayIds: string[][];
  if (saved?.length) {
    dayIds = saved.map((d) => d.filter((id) => byId.has(id))).filter((d) => d.length);
    // Match grup yang belum ada di jadwal tersimpan (mis. data lama) → matchday tambahan.
    const seen = new Set(saved.flat());
    const extra = groupMatches.filter((m) => !seen.has(m.id)).map((m) => m.id);
    if (extra.length) dayIds.push(extra);
  } else {
    dayIds = buildGroupMatchdays(competition.groups ?? [], groupMatches);
  }
  // Dalam tiap matchday, urutkan laga berdasarkan grup (A→B→C…) agar rapi.
  return dayIds.map((d) =>
    d.map((id) => byId.get(id)!).filter(Boolean)
      .sort((a, b) => (a.groupKey ?? '').localeCompare(b.groupKey ?? '')),
  );
}

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

/** Skor tie untuk team1/team2 dari semua leg yang sudah selesai (1 atau 2 leg). Null bila belum ada hasil. */
function tieScore(team1: string, team2: string, tieMatches: CompetitionMatch[]): { a: number; b: number } | null {
  const finished = tieMatches.filter((m) => m.status === 'finished');
  if (!finished.length) return null;
  return sumTieScore(team1, team2, finished);
}

function sumTieScore(team1: string, team2: string, finished: CompetitionMatch[]): { a: number; b: number } {
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
  const teams = useTeamStore((s) => s.teams);

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

  // Nama ringkas (TLA dari tim global bila ada) untuk tabel/kartu yang sempit.
  const participantShort = (pid: string | null | undefined): string => {
    if (!pid) return '—';
    const p = participants.find((x) => x.id === pid);
    if (!p) return pid;
    const team = p.clubExternalId ? teams.find((t) => t.externalId === p.clubExternalId) : undefined;
    return team?.shortName || p.clubName || p.playerId;
  };

  async function guarded(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const tabs: TabName[] = ['setup', 'draw', 'schedule', 'group', 'knockout', 'champion'];

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
      {activeTab === 'schedule' ? (
        <ScheduleTab competition={competition} matches={matches} isAdmin={isAdmin} guarded={guarded} participantShort={participantShort} />
      ) : null}
      {activeTab === 'group' ? (
        <GroupTab competition={competition} participants={participants} matches={matches} isAdmin={isAdmin} guarded={guarded} participantName={participantName} participantShort={participantShort} />
      ) : null}
      {activeTab === 'knockout' ? (
        <KnockoutTab competition={competition} participants={participants} matches={matches} isAdmin={isAdmin} guarded={guarded} participantName={participantName} participantShort={participantShort} />
      ) : null}
      {activeTab === 'champion' ? (
        <ChampionTab competition={competition} participants={participants} matches={matches} />
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

        <div className="draw-result-grid">
          {participants.map((p) => (
            <div key={p.id} className={`draw-result ${p.clubName ? 'draw-result--done' : 'draw-result--pending'}`}>
              <div className="draw-result__crest">
                {p.clubLogo ? (
                  <img className="draw-result__logo" src={p.clubLogo} alt="" loading="lazy" />
                ) : (
                  <span className="draw-result__logo draw-result__logo--empty" aria-hidden>{p.clubName ? '⚽' : '?'}</span>
                )}
              </div>
              <div className="draw-result__body">
                <span className="draw-result__club">{p.clubName || 'Menunggu undian'}</span>
                <span className="draw-result__manager">{playerName(p.playerId)}</span>
              </div>
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

// ===== Schedule tab (urutan main fase grup: acak + kunci) =====

function ScheduleTab({ competition, matches, isAdmin, guarded, participantShort }: {
  competition: Competition;
  matches: CompetitionMatch[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantShort: (pid: string | null | undefined) => string;
}) {
  const shuffleGroupSchedule = useCompetitionStore((s) => s.shuffleGroupSchedule);
  const lockGroupSchedule = useCompetitionStore((s) => s.lockGroupSchedule);

  const allGroupMatches = matches.filter((m) => m.stage === 'group');
  const matchdays = getScheduleMatchdays(competition, allGroupMatches);
  const locked = !!competition.settings.scheduleLocked;
  const hasResults = allGroupMatches.some((m) => m.status === 'finished');
  const canManage = isAdmin && !locked && !hasResults;

  if (!matchdays.length) {
    return <div className="empty">Jadwal grup belum dibuat. Selesaikan undian grup terlebih dahulu.</div>;
  }

  return (
    <section className="card">
      <div className="schedule-head">
        <div>
          <h2 style={{ margin: 0 }}>Jadwal fase grup</h2>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {locked
              ? 'Jadwal telah dikunci dan tidak dapat diubah.'
              : 'Tiap matchday memuat semua grup. Acak urutan, lalu kunci agar menjadi jadwal resmi.'}
          </p>
        </div>
        <div className="schedule-actions">
          {locked ? (
            <span className="badge schedule-locked">🔒 Terkunci</span>
          ) : isAdmin ? (
            <>
              <button
                className="btn"
                type="button"
                disabled={!canManage}
                onClick={() => guarded(() => shuffleGroupSchedule(competition.id))}
              >
                🎲 Acak jadwal
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={!canManage}
                onClick={() => guarded(() => lockGroupSchedule(competition.id))}
              >
                🔒 Kunci jadwal
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isAdmin && !locked && hasResults ? (
        <p className="muted" style={{ marginTop: 10, fontSize: 12, color: 'var(--warning)' }}>
          Sudah ada hasil pertandingan — jadwal tidak bisa diacak lagi. Kunci untuk menetapkannya.
        </p>
      ) : null}

      <div className="schedule-days">
        {matchdays.map((day, di) => (
          <div className="schedule-day" key={di}>
            <div className="schedule-day__header">
              <span className="schedule-day__title">Matchday {di + 1}</span>
              <span className="schedule-day__count">{day.length} laga</span>
            </div>
            <ul className="schedule-list">
              {day.map((m) => (
                <li className="schedule-row" key={m.id}>
                  <span className="schedule-row__group">{m.groupKey}</span>
                  <span className="schedule-row__teams">
                    <span className="schedule-row__home">{participantShort(m.homeParticipantId)}</span>
                    {m.status === 'finished' ? (
                      <span className="schedule-row__score">{m.homeScore} - {m.awayScore}</span>
                    ) : (
                      <span className="schedule-row__vs">vs</span>
                    )}
                    <span className="schedule-row__away">{participantShort(m.awayParticipantId)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===== Group tab (klasemen + input skor) =====

function GroupTab({ competition, participants, matches, isAdmin, guarded, participantName, participantShort }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  matches: CompetitionMatch[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
  participantShort: (pid: string | null | undefined) => string;
}) {
  const saveGroupResult = useCompetitionStore((s) => s.saveGroupResult);
  const startKnockout = useCompetitionStore((s) => s.startKnockout);
  const groups = competition.groups ?? [];
  const groupMatches = getScheduleMatchdays(competition, matches.filter((m) => m.stage === 'group')).flat();
  const allFinished = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'finished');
  const playedCount = groupMatches.filter((m) => m.status === 'finished').length;
  // Skor grup hanya bisa diedit selama fase grup; setelah knockout dimulai,
  // klasemen dibekukan agar tidak desync dengan bracket yang sudah di-seed.
  const scoreEditable = isAdmin && competition.status === 'group_stage';

  const allStandings = groups.map((g) => computeGroupStandings(g, participants, matches));
  const qualifiedThirds = competition.settings.qualifyMode === 'top2_plus_best_thirds'
    ? new Set(rankBestThirds(allStandings, competition.settings.bestThirdsCount ?? 0))
    : new Set<string>();

  const clubLogo = (pid: string | null | undefined): string | null => {
    if (!pid) return null;
    return participants.find((x) => x.id === pid)?.clubLogo ?? null;
  };

  function qualifyBadge(rank: number, participantId: string): string | null {
    const mode = competition.settings.qualifyMode;
    if (rank === 1) return 'lolos';
    if (rank === 2 && (mode === 'top2' || mode === 'top2_plus_best_thirds')) return 'lolos';
    if (rank === 3 && qualifiedThirds.has(participantId)) return 'best 3rd';
    return null;
  }

  return (
    <>
      {groups.length ? (
        <div className="group-stage-bar">
          <span className="group-stage-bar__title">Fase Grup</span>
          <span className="group-stage-bar__meta">{playedCount}/{groupMatches.length} laga selesai</span>
          <span className="group-stage-bar__track">
            <span
              className="group-stage-bar__fill"
              style={{ width: `${groupMatches.length ? (playedCount / groupMatches.length) * 100 : 0}%` }}
            />
          </span>
        </div>
      ) : null}

      <div className="group-stage-layout">
        <div className="group-stage-col group-stage-col--standings">
          {groups.map((g, gi) => (
            <section className="card group-stage-card" key={g.key}>
              <div className="group-stage-card__head">
                <span className="group-card__badge">{g.key}</span>
                <span className="group-stage-card__title">Grup {g.key}</span>
              </div>

              <table className="standings-table">
                <thead>
                  <tr>
                    <th className="standings-table__rank">#</th>
                    <th>Klub</th>
                    <th title="Main">M</th>
                    <th title="Menang">M</th>
                    <th title="Seri">S</th>
                    <th title="Kalah">K</th>
                    <th title="Selisih gol">SG</th>
                    <th title="Poin">Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {allStandings[gi].map((row) => {
                    const badge = qualifyBadge(row.rank, row.participantId);
                    const logo = clubLogo(row.participantId);
                    return (
                      <tr key={row.participantId} className={badge ? 'standings-table__row--qualified' : ''}>
                        <td className="standings-table__rank">
                          <span className={`standings-rank standings-rank--${row.rank <= 2 ? row.rank : 'out'}`}>{row.rank}</span>
                        </td>
                        <td>
                          <span className="standings-club">
                            {logo ? (
                              <img className="standings-club__logo" src={logo} alt="" loading="lazy" />
                            ) : (
                              <span className="standings-club__logo standings-club__logo--empty" aria-hidden>⚽</span>
                            )}
                            <span className="standings-club__name" title={participantName(row.participantId)}>{participantShort(row.participantId)}</span>
                            {badge ? <span className={`badge ${badge === 'lolos' ? 'success' : ''} standings-club__badge`}>{badge}</span> : null}
                          </span>
                        </td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.drawn}</td>
                        <td>{row.lost}</td>
                        <td className={row.gd > 0 ? 'standings-pos' : row.gd < 0 ? 'standings-neg' : ''}>
                          {row.gd > 0 ? `+${row.gd}` : row.gd}
                        </td>
                        <td><strong className="standings-pts">{row.pts}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <div className="group-stage-col group-stage-col--matches">
          {groups.map((g) => (
            <section className="card group-stage-card" key={g.key}>
              <div className="group-stage-card__head">
                <span className="group-card__badge">{g.key}</span>
                <span className="group-stage-card__title">Jadwal Grup {g.key}</span>
              </div>
              <div className="match-feed">
                {groupMatches.filter((m) => m.groupKey === g.key).map((m) => (
                  <MatchRow key={m.id} match={m} editable={scoreEditable} guarded={guarded} participantName={participantShort} clubLogo={clubLogo} onSave={saveGroupResult} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {isAdmin && competition.status === 'group_stage' ? (
        <button className="btn primary" type="button" style={{ marginTop: 18 }} disabled={!allFinished} onClick={() => guarded(() => startKnockout(competition.id))}>
          Mulai knockout
        </button>
      ) : null}
    </>
  );
}

function MatchRow({ match, editable, guarded, participantName, clubLogo, onSave }: {
  match: CompetitionMatch;
  editable: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
  clubLogo?: (pid: string | null | undefined) => string | null;
  onSave: (matchId: string, home: number, away: number) => Promise<void>;
}) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [saving, setSaving] = useState(false);

  // Sinkronkan input dengan skor tersimpan bila match berubah dari store
  // (mis. setelah reload / re-seed), agar tidak menampilkan nilai usang.
  useEffect(() => {
    setHome(match.homeScore ?? 0);
    setAway(match.awayScore ?? 0);
  }, [match.homeScore, match.awayScore]);

  const finished = match.status === 'finished';
  const homeLogo = clubLogo?.(match.homeParticipantId) ?? null;
  const awayLogo = clubLogo?.(match.awayParticipantId) ?? null;
  const homeWin = finished && Number(match.homeScore) > Number(match.awayScore);
  const awayWin = finished && Number(match.awayScore) > Number(match.homeScore);

  async function handleSave() {
    setSaving(true);
    await guarded(() => onSave(match.id, home, away));
    setSaving(false);
  }

  return (
    <div className={`match-card ${finished ? 'match-card--played' : ''} ${editable ? 'match-card--edit' : ''}`}>
      <div className={`match-card__side match-card__side--home ${homeWin ? 'match-card__side--win' : ''}`}>
        <span className="match-card__name">{participantName(match.homeParticipantId)}</span>
        {homeLogo ? (
          <img className="match-card__logo" src={homeLogo} alt="" loading="lazy" />
        ) : (
          <span className="match-card__logo match-card__logo--empty" aria-hidden>⚽</span>
        )}
      </div>

      {editable ? (
        <div className="match-card__score match-card__score--edit">
          <input type="number" min={0} value={home} onChange={(e) => setHome(Number(e.target.value))} />
          <span className="match-card__dash">-</span>
          <input type="number" min={0} value={away} onChange={(e) => setAway(Number(e.target.value))} />
        </div>
      ) : (
        <div className="match-card__score">
          {finished ? (
            <>
              <span className="match-card__num">{match.homeScore}</span>
              <span className="match-card__dash">-</span>
              <span className="match-card__num">{match.awayScore}</span>
            </>
          ) : (
            <span className="match-card__vs">vs</span>
          )}
        </div>
      )}

      <div className={`match-card__side match-card__side--away ${awayWin ? 'match-card__side--win' : ''}`}>
        {awayLogo ? (
          <img className="match-card__logo" src={awayLogo} alt="" loading="lazy" />
        ) : (
          <span className="match-card__logo match-card__logo--empty" aria-hidden>⚽</span>
        )}
        <span className="match-card__name">{participantName(match.awayParticipantId)}</span>
      </div>

      {editable ? (
        <button className="btn btn-xs primary match-card__save" type="button" disabled={saving} onClick={handleSave}>
          {saving ? '…' : 'Simpan'}
        </button>
      ) : null}
    </div>
  );
}

/** Baris leg ringkas untuk tie knockout: label leg, logo+skor home/away, dan input edit. */
function LegRow({ match, legLabel, editable, guarded, clubLogo, onSave }: {
  match: CompetitionMatch;
  legLabel: string | null;
  editable: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  clubLogo: (pid: string | null | undefined) => string | null;
  onSave: (matchId: string, home: number, away: number) => Promise<void>;
}) {
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHome(match.homeScore ?? 0);
    setAway(match.awayScore ?? 0);
  }, [match.homeScore, match.awayScore]);

  const finished = match.status === 'finished';
  const homeLogo = clubLogo(match.homeParticipantId);
  const awayLogo = clubLogo(match.awayParticipantId);

  function logoEl(src: string | null) {
    return src
      ? <img className="leg-row__logo" src={src} alt="" loading="lazy" />
      : <span className="leg-row__logo leg-row__logo--empty" aria-hidden>⚽</span>;
  }

  async function handleSave() {
    setSaving(true);
    await guarded(() => onSave(match.id, home, away));
    setSaving(false);
  }

  return (
    <div className={`leg-row ${editable ? 'leg-row--edit' : ''}`}>
      {legLabel ? <span className="leg-row__label">{legLabel}</span> : null}
      <span className="leg-row__pair">
        {logoEl(homeLogo)}
        {editable ? (
          <input type="number" min={0} value={home} onChange={(e) => setHome(Number(e.target.value))} />
        ) : (
          <b className="leg-row__num">{finished ? match.homeScore : '–'}</b>
        )}
        <span className="leg-row__dash">-</span>
        {editable ? (
          <input type="number" min={0} value={away} onChange={(e) => setAway(Number(e.target.value))} />
        ) : (
          <b className="leg-row__num">{finished ? match.awayScore : '–'}</b>
        )}
        {logoEl(awayLogo)}
      </span>
      {editable ? (
        <button className="btn btn-xs primary leg-row__save" type="button" disabled={saving} onClick={handleSave}>
          {saving ? '…' : 'Simpan'}
        </button>
      ) : null}
    </div>
  );
}

// ===== Knockout tab =====

function KnockoutTab({ competition, participants, matches, isAdmin, guarded, participantName, participantShort }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  matches: CompetitionMatch[];
  isAdmin: boolean;
  guarded: (a: () => Promise<void>) => Promise<void>;
  participantName: (pid: string | null | undefined) => string;
  participantShort: (pid: string | null | undefined) => string;
}) {
  const saveKnockoutResult = useCompetitionStore((s) => s.saveKnockoutResult);
  const resolveTie = useCompetitionStore((s) => s.resolveTie);
  const bracket = competition.bracket;
  // Skor knockout terkunci setelah turnamen selesai.
  const scoreEditable = isAdmin && competition.status === 'knockout';

  const clubLogo = (pid: string | null | undefined): string | null => {
    if (!pid) return null;
    return participants.find((x) => x.id === pid)?.clubLogo ?? null;
  };

  function teamSlot(pid: string | null | undefined, isWinner: boolean) {
    const logo = clubLogo(pid);
    return (
      <span className={`tie-team ${isWinner ? 'tie-team--win' : ''}`}>
        {logo ? (
          <img className="tie-team__logo" src={logo} alt="" loading="lazy" />
        ) : (
          <span className="tie-team__logo tie-team__logo--empty" aria-hidden>⚽</span>
        )}
        <span className="tie-team__name" title={participantName(pid)}>{participantShort(pid)}</span>
      </span>
    );
  }

  if (!bracket) return <div className="empty">Bracket belum dibuat.</div>;

  return (
    <>
      {bracket.warning ? <div className="empty" style={{ color: 'var(--warning, #f0b429)' }}>{bracket.warning}</div> : null}
      <div className="bracket-rounds-row">
        {bracket.rounds.map((round, ri) => {
          const isFinal = ri === bracket.rounds.length - 1;
          return (
            <div className="bracket-round-col" key={ri}>
              <div className="bracket-section-header">{isFinal ? 'Final' : `Babak ${ri + 1}`}</div>
              {round.map((tie, ti) => {
                const tieMatches = matches.filter((m) => m.stage === 'knockout' && m.round === ri && m.tieIndex === ti);
                const score = tie.team1 && tie.team2 ? tieScore(tie.team1, tie.team2, tieMatches) : null;
                const multiLeg = tieMatches.length > 1;
                const canResolve = isAdmin && !tie.winner && !tie.bye && tie.team1 && tie.team2 && tieMatches.length > 0 && tieMatches.every((m) => m.status === 'finished');
                return (
                  <div className={`tie-card ${isFinal ? 'tie-card--final' : ''} ${tie.winner ? 'tie-card--decided' : ''}`} key={ti}>
                    <div className="tie-card__head">
                      {teamSlot(tie.team1, tie.winner === tie.team1)}
                      <span className={`tie-card__agg ${score ? '' : 'tie-card__agg--empty'}`}>
                        {score ? <>{score.a}<i>·</i>{score.b}</> : 'VS'}
                      </span>
                      {teamSlot(tie.team2, tie.winner === tie.team2)}
                    </div>

                    {(tie.bye || tie.winner) ? (
                      <div className="tie-card__status">
                        {tie.bye ? <span className="tie-card__note">Bye → lolos otomatis</span> : null}
                        {tie.winner ? <span className="tie-card__winner">🏆 {participantName(tie.winner)} lolos</span> : null}
                      </div>
                    ) : null}

                    {tieMatches.length ? (
                      <div className="tie-card__legs">
                        {multiLeg ? <span className="tie-card__agg-label">Agregat</span> : null}
                        {tieMatches.map((m, li) => (
                          <LegRow
                            key={m.id}
                            match={m}
                            legLabel={multiLeg ? `Leg ${m.leg ?? li + 1}` : null}
                            editable={scoreEditable}
                            guarded={guarded}
                            clubLogo={clubLogo}
                            onSave={saveKnockoutResult}
                          />
                        ))}
                      </div>
                    ) : null}

                    {canResolve ? (
                      <TieResolver tie1={tie.team1!} tie2={tie.team2!} participantName={participantName} onResolve={(winnerId) => guarded(() => resolveTie(competition.id, ri, ti, winnerId))} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
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
    <div className="tie-resolver">
      <span className="tie-resolver__hint">Agregat seri — pilih yang lolos:</span>
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

function ChampionTab({ competition, participants, matches }: {
  competition: Competition;
  participants: CompetitionParticipant[];
  matches: CompetitionMatch[];
}) {
  const players = usePlayerStore((s) => s.players);

  // Confetti dengan posisi/jeda/durasi/arah acak, dihitung sekali agar stabil.
  const confetti = useMemo(
    () => Array.from({ length: 32 }).map(() => ({
      left: Math.random() * 100,
      delay: -Math.random() * 3.4,
      duration: 2.8 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 120,
      spin: 360 + Math.random() * 540,
    })),
    [],
  );

  if (competition.status !== 'finished' || !competition.championId) {
    return <div className="empty">Juara belum ditentukan.</div>;
  }

  const champ = participants.find((p) => p.id === competition.championId);
  const playerName = (pid?: string) => players.find((x) => x.id === pid)?.name;

  // Runner-up = peserta lain di tie final.
  const rounds = competition.bracket?.rounds ?? [];
  const finalIdx = rounds.length - 1;
  const finalRound = rounds[finalIdx];
  const finalTie = finalRound?.length === 1 ? finalRound[0] : undefined;
  const runnerUpId = finalTie
    ? (finalTie.winner === finalTie.team1 ? finalTie.team2 : finalTie.team1)
    : undefined;
  const runnerUp = runnerUpId ? participants.find((p) => p.id === runnerUpId) : undefined;

  // Skor final (champ vs runner-up) dari leg-leg babak terakhir.
  const finalMatches = matches.filter((m) => m.stage === 'knockout' && m.round === finalIdx && m.tieIndex === 0);
  const finalScore = champ && runnerUpId ? tieScore(champ.id, runnerUpId, finalMatches) : null;

  // Jumlah kemenangan champ di knockout (sebagai "perjalanan juara").
  const champWins = champ
    ? matches.filter((m) =>
        m.stage === 'knockout' && m.status === 'finished' &&
        ((m.homeParticipantId === champ.id && Number(m.homeScore) > Number(m.awayScore)) ||
         (m.awayParticipantId === champ.id && Number(m.awayScore) > Number(m.homeScore))),
      ).length
    : 0;

  return (
    <section className="champion">
      <div className="champion__spotlight">
        <span className="champion__overline">{competition.name}</span>
        <span className="champion__label">🏆 Juara Turnamen</span>

        <div className="champion__crest">
          <span className="champion__ring" aria-hidden />
          <span className="champion__glow" aria-hidden />
          {champ?.clubLogo ? (
            <img className="champion__logo" src={champ.clubLogo} alt={champ.clubName ?? ''} />
          ) : (
            <span className="champion__logo champion__logo--empty" aria-hidden>🏆</span>
          )}
          <span className="champion__trophy" aria-hidden>🏆</span>
        </div>

        <h2 className="champion__club">
          <span className="champion__laurel champion__laurel--l" aria-hidden>🌿</span>
          <span className="champion__club-name">{champ?.clubName || competition.championId}</span>
          <span className="champion__laurel champion__laurel--r" aria-hidden>🌿</span>
        </h2>
        {playerName(champ?.playerId) ? (
          <p className="champion__player">Manajer · {playerName(champ?.playerId)}</p>
        ) : null}

        <div className="champion__stats">
          {finalScore ? (
            <span className="champion__stat">
              <b>Final</b> {finalScore.a}<i>–</i>{finalScore.b}
            </span>
          ) : null}
          {champWins > 0 ? (
            <span className="champion__stat"><b>{champWins}</b> kemenangan KO</span>
          ) : null}
        </div>

        <div className="champion__confetti" aria-hidden>
          {confetti.map((c, i) => (
            <span
              key={i}
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                '--drift': `${c.drift}px`,
                '--spin': `${c.spin}deg`,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>

      {runnerUp ? (
        <div className="champion__runnerup">
          <span className="champion__runnerup-label">🥈 Runner-up</span>
          {runnerUp.clubLogo ? (
            <img className="champion__runnerup-logo" src={runnerUp.clubLogo} alt="" />
          ) : (
            <span className="champion__runnerup-logo champion__runnerup-logo--empty" aria-hidden>⚽</span>
          )}
          <span className="champion__runnerup-name">{runnerUp.clubName || runnerUpId}</span>
          {playerName(runnerUp.playerId) ? (
            <span className="champion__runnerup-player">· {playerName(runnerUp.playerId)}</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
