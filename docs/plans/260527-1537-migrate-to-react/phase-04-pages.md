# Phase 04: Pages

## Objective

Konversi 5 halaman HTML lama menjadi React page components. Urutan pengerjaan: Settings → Leagues → League → Teams → Season (dari yang paling sederhana ke paling kompleks).

## Scope

- **Files yang dibuat:**
  - `src/pages/SettingsPage.tsx`
  - `src/pages/LeaguesPage.tsx`
  - `src/pages/LeaguePage.tsx`
  - `src/pages/TeamsPage.tsx`
  - `src/pages/SeasonPage.tsx`
- **Referensi (baca saja, jangan ubah):**
  - `js/settings.js`, `js/leagues.js`, `js/league.js`, `js/teams.js`, `js/season.js`

## Preconditions

- Phase 1-3 selesai: lib, store, dan components sudah ada.

## Tasks

### 1. Buat `src/pages/SettingsPage.tsx`

Berdasarkan `js/settings.js`. Sederhana: form untuk input/display API key.

```tsx
import { useState } from 'react';
import { Shell } from '../components/Shell';
import { getSettings, saveSettings } from '../lib/storage';

export function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => getSettings().apiKey || '');
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({ apiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearCache() {
    if (confirm('Clear all cached club data?')) {
      localStorage.removeItem('clubs_cache');
    }
  }

  return (
    <Shell active="settings" title="Settings">
      <section className="card">
        <h2>API Football Key</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your-api-key"
            />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn primary" type="submit">
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </form>
      </section>
      <section className="card" style={{ marginTop: 18 }}>
        <h2>Cache</h2>
        <p className="muted">Club data is cached for 7 days.</p>
        <button className="btn danger" type="button" onClick={handleClearCache}>
          Clear club cache
        </button>
      </section>
    </Shell>
  );
}
```

### 2. Buat `src/pages/LeaguesPage.tsx`

Berdasarkan `js/leagues.js`. Menampilkan daftar liga + form buat liga baru.

```tsx
import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { Badge } from '../components/Badge';
import { useLeagueStore } from '../store/useLeagueStore';
import { useTeamStore } from '../store/useTeamStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { byCreatedAtDesc } from '../lib/storage';

export function LeaguesPage() {
  const navigate = useNavigate();
  const leagues = useLeagueStore((s) => [...s.leagues].sort(byCreatedAtDesc));
  const teams = useTeamStore((s) => s.teams);
  const seasons = useSeasonStore((s) => s.seasons);
  const createLeague = useLeagueStore((s) => s.createLeague);
  const deleteLeague = useLeagueStore((s) => s.deleteLeague);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const league = createLeague({
      name: String(data.get('name')).trim(),
      description: String(data.get('description')).trim(),
      createdAt: new Date().toISOString(),
      settings: {
        meetingsPerSeason: Number(data.get('meetingsPerSeason')),
        continuousSeasons: data.get('continuousSeasons') === 'true',
      },
    });
    navigate(`/league/${league.id}`);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this league and all related teams, seasons, and matches?')) {
      deleteLeague(id);
    }
  }

  return (
    <Shell active="leagues" title="Leagues">
      <section className="card">
        <h2>Create league</h2>
        <form className="form-grid" onSubmit={handleCreate}>
          {/* ... form fields identik dengan leagues.js ... */}
        </form>
      </section>
      <section style={{ marginTop: 18 }}>
        {leagues.length ? (
          <div className="grid">
            {leagues.map((league) => {
              const leagueTeams = teams.filter((t) => t.leagueId === league.id);
              const activeSeason = seasons.find((s) => s.leagueId === league.id && s.status === 'active');
              const latestSeason = seasons
                .filter((s) => s.leagueId === league.id)
                .sort((a, b) => b.number - a.number)[0];
              const badgeStatus = activeSeason ? 'active' : latestSeason?.status ?? 'no season';
              return (
                <article className="card" key={league.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h2>{league.name}</h2>
                    <Badge status={badgeStatus} />
                  </div>
                  <p className="muted">{league.description || 'No description'}</p>
                  <div className="row">
                    <span className="badge">{leagueTeams.length} teams</span>
                    <span className="badge">{league.settings.meetingsPerSeason} meeting{league.settings.meetingsPerSeason === 1 ? '' : 's'}</span>
                    {league.settings.continuousSeasons && <span className="badge success">continuous</span>}
                  </div>
                  <div className="actions">
                    <button className="btn primary" onClick={() => navigate(`/league/${league.id}`)}>Open</button>
                    <button className="btn danger" onClick={() => handleDelete(league.id)}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">No leagues yet. Create one to begin.</div>
        )}
      </section>
    </Shell>
  );
}
```

### 3. Buat `src/pages/LeaguePage.tsx`

Berdasarkan `js/league.js`. Menampilkan detail liga, daftar musim, tombol buat musim baru.

- Gunakan `useParams<{ id: string }>()` untuk ambil league ID
- Gunakan `useNavigate()` untuk tombol "Manage Teams" → `/league/:id/teams`
- Tombol "Start Season" → panggil `useSeasonStore().createSeason()` lalu navigate ke season baru

### 4. Buat `src/pages/TeamsPage.tsx`

Berdasarkan `js/teams.js`. Halaman terpanjang ke-2 — menampilkan pool teams dan active teams, import dari API, dan tombol spin wheel.

Key differences dari versi JS:
- Modal import clubs: gunakan React `useState(showImportModal)` alih-alih DOM manipulation
- Modal spin wheel: render `<SpinWheel>` dengan prop `open={showWheel}`
- "Import clubs" flow: `useState` untuk track search state, results, dan loading

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { TeamBadge } from '../components/TeamBadge';
import { SpinWheel } from '../components/SpinWheel';
import { useTeamStore } from '../store/useTeamStore';
import { useLeagueStore } from '../store/useLeagueStore';
import { fetchClubs } from '../lib/api';
import { getSettings } from '../lib/storage';
// ... dst

export function TeamsPage() {
  const { id: leagueId } = useParams<{ id: string }>();
  const [showWheel, setShowWheel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  // ... dst

  return (
    <Shell active="leagues" title={`${league?.name} — Teams`} actions={<BackButton />}>
      {/* Pool section */}
      {/* Active section */}
      <SpinWheel
        leagueId={leagueId!}
        open={showWheel}
        onClose={() => setShowWheel(false)}
        onDone={() => { /* refresh */ }}
      />
      {showImport && <ImportModal leagueId={leagueId!} onClose={() => setShowImport(false)} />}
    </Shell>
  );
}
```

**Catatan penting untuk import modal:** `js/teams.js` memiliki flow import yang kompleks (search competition → pilih kompetisi → fetch clubs → tampilkan list → tambah ke pool). Implementasikan sebagai sub-component `ImportModal` di dalam file `TeamsPage.tsx` (tidak perlu file terpisah).

### 5. Buat `src/pages/SeasonPage.tsx`

Berdasarkan `js/season.js` — file paling kompleks (~445 baris). Konversi bertahap:

**5a. State management:**
```tsx
const [activeTab, setActiveTab] = useState<'schedule' | 'standings' | 'playoff'>('schedule');
```

**5b. Tab rendering:**
```tsx
{activeTab === 'schedule' && <ScheduleTab season={season} league={league} />}
{activeTab === 'standings' && <StandingsTab seasonId={season.id} league={league} />}
{showPlayoffTab && activeTab === 'playoff' && <PlayoffTab season={season} league={league} />}
```

**5c. Implementasi sebagai sub-components dalam satu file:**
- `ScheduleTab` — list matchdays + match cards + score input
- `StandingsTab` — kalkulasi via `calculateStandings()`, render tabel
- `PlayoffTab` — render bracket, setup, dan score input playoff

**5d. Auto-finish logic:**
Port `finishSeason()` ke `useEffect`:
```tsx
useEffect(() => {
  const leagueMatches = matches.filter((m) => m.seasonId === season?.id && (m.matchType || 'league') === 'league');
  const allFinished = leagueMatches.length > 0 && leagueMatches.every((m) => m.status === 'finished');
  if (season?.status === 'active' && allFinished) {
    finishSeason();
  }
}, [matches, season?.status]);
```

**5e. Playoff bracket rendering:**
Port `renderSlot()` dari `season.js` ke fungsi helper atau sub-component di dalam `SeasonPage.tsx`. Gunakan `resolveMultiLegWinnerPublic()` dari `schedule.ts`.

## Acceptance Criteria

- 5 page components ada di `src/pages/`
- Setiap page menggunakan `Shell` component
- Tidak ada `document.getElementById`, `innerHTML`, atau `addEventListener` di React components
- `npx tsc --noEmit` bersih
- `npm run build` sukses

## Verification

```bash
npx tsc --noEmit
npm run build
```

Review setiap page untuk pastikan tidak ada raw DOM manipulation.

## Idempotence and Recovery

- Safe re-run: Ya.
- SeasonPage adalah yang paling berisiko karena kompleksitas — jika ada bug, gunakan `js/season.js` sebagai referensi dan port bagian per bagian.

## Exit Criteria

- [ ] `src/pages/SettingsPage.tsx` — kompilasi OK
- [ ] `src/pages/LeaguesPage.tsx` — kompilasi OK
- [ ] `src/pages/LeaguePage.tsx` — kompilasi OK
- [ ] `src/pages/TeamsPage.tsx` — kompilasi OK, SpinWheel terintegrasi
- [ ] `src/pages/SeasonPage.tsx` — kompilasi OK, 3 tabs (schedule/standings/playoff)
- [ ] `npm run build` sukses
