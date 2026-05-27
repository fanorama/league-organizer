# Phase 03: Shell & Shared Components

## Objective

Buat komponen React yang menggantikan fungsi-fungsi shared di `js/ui.js` dan modal spin wheel dari `js/wheel.js`.

## Scope

- **Files yang dibuat:**
  - `src/components/Shell.tsx`
  - `src/components/Badge.tsx`
  - `src/components/TeamBadge.tsx`
  - `src/components/SpinWheel.tsx`
- **Files yang TIDAK diubah:** `src/lib/`, `src/store/`, CSS lama, JS lama

## Preconditions

- Phase 1 dan 2 selesai.
- CSS class names tersedia via `main.css` yang sudah diimport di `src/main.tsx`.

## Tasks

### 1. Buat `src/components/Shell.tsx`

Menggantikan `renderShell()` dari `ui.js`. CSS class names harus identik:

```tsx
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ShellProps {
  active: 'leagues' | 'settings';
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ active, title, actions, children }: ShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">⚽</span>
            <span className="brand-name">LeagueOrg</span>
          </Link>
          <nav className="top-nav">
            <Link className={active === 'leagues' ? 'active' : ''} to="/">Leagues</Link>
            <Link className={active === 'settings' ? 'active' : ''} to="/settings">Settings</Link>
          </nav>
        </div>
      </header>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-actions">{actions}</div>
        </header>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 2. Buat `src/components/Badge.tsx`

Menggantikan fungsi `badge()` dari `ui.js`:

```tsx
type BadgeStatus = 'setup' | 'active' | 'finished' | 'delayed' | 'scheduled' | 'error' | 'no season' | 'playoff_setup' | 'playoff_active';

const STATUS_CLASSES: Partial<Record<BadgeStatus, string>> = {
  setup: 'warning',
  active: 'success',
  delayed: 'warning',
  error: 'danger',
  'playoff_setup': 'warning',
  'playoff_active': 'warning',
};

const STATUS_LABELS: Partial<Record<BadgeStatus, string>> = {
  playoff_setup: 'Playoff Setup',
  playoff_active: 'Playoff',
};

interface BadgeProps {
  status: BadgeStatus | string;
}

export function Badge({ status }: BadgeProps) {
  const cls = STATUS_CLASSES[status as BadgeStatus] || '';
  const label = STATUS_LABELS[status as BadgeStatus] || status;
  return <span className={`badge ${cls}`}>{label}</span>;
}
```

### 3. Buat `src/components/TeamBadge.tsx`

Menggantikan fungsi `teamBadge()` dari `ui.js`:

```tsx
import type { Team } from '../lib/types';

interface TeamBadgeProps {
  team?: Team | null;
}

export function TeamBadge({ team }: TeamBadgeProps) {
  if (!team) return <span className="team-badge">?</span>;

  const value = team.badge || team.shortName || '?';
  if (/^https?:\/\//.test(value)) {
    return <span className="team-badge"><img src={value} alt="" /></span>;
  }
  return <span className="team-badge">{value}</span>;
}
```

### 4. Buat `src/components/SpinWheel.tsx`

Port dari `js/wheel.js`. Perbedaan kunci:
- Tidak lagi `document.createElement("div")` + `document.body.append()`
- Visibility dikontrol via prop `open` + parent state
- CSS `transform: rotate()` diapply via `wheelRef.current.style.transform`
- Canvas/DOM element diakses via `useRef`

```tsx
import { useState, useRef } from 'react';
import { useTeamStore } from '../store/useTeamStore';
import type { Team } from '../lib/types';

interface SpinWheelProps {
  leagueId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function SpinWheel({ leagueId, open, onClose, onDone }: SpinWheelProps) {
  const teams = useTeamStore((s) => s.teams.filter((t) => t.leagueId === leagueId));
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const [selected, setSelected] = useState<Team | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [wheelLabel, setWheelLabel] = useState('Ready');
  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);

  const poolTeams = teams.filter((t) => (t.status || 'pool') === 'pool');

  function handleSpin() {
    if (!poolTeams.length) return;
    const winner = poolTeams[Math.floor(Math.random() * poolTeams.length)];
    rotationRef.current += 720 + Math.floor(Math.random() * 720);
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    }
    setWheelLabel(winner.shortName || winner.name);
    setTimeout(() => setSelected(winner), 900);
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    updateTeam({ ...selected, owner: ownerInput.trim(), status: 'active' });
    setSelected(null);
    setOwnerInput('');
    setWheelLabel('Ready');
    onDone();
  }

  if (!open) return null;

  return (
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h2>Assign owner</h2>
          <button className="btn" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <div className="wheel" ref={wheelRef}><span>{wheelLabel}</span></div>
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
                    onChange={(e) => setOwnerInput(e.target.value)}
                  />
                </div>
                <button className="btn primary" type="submit">Assign</button>
              </form>
            ) : poolTeams.length ? (
              <>
                <p className="muted">{poolTeams.length} teams waiting for owner assignment.</p>
                <button className="btn primary" type="button" onClick={handleSpin}>Spin</button>
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
```

**Catatan:** Tidak ada Canvas — wheel menggunakan CSS `transform: rotate()` persis seperti versi lama.

### 5. Update `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/main.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Buat stub `src/App.tsx` untuk sementara:

```tsx
export default function App() {
  return <div>League Organizer (migrating...)</div>;
}
```

## Acceptance Criteria

- 4 component files ada di `src/components/`
- `Shell.tsx` menggunakan CSS class names identik dengan `renderShell()` di `ui.js`
- `SpinWheel.tsx` menggunakan `useRef` untuk wheel element, bukan akses DOM langsung
- `npx tsc --noEmit` bersih
- `npm run dev` → browser menampilkan placeholder text dari `App.tsx`

## Verification

```bash
npx tsc --noEmit
npm run dev
# Buka browser, pastikan tidak ada error console
```

## Idempotence and Recovery

- Safe re-run: Ya.
- Jika SpinWheel CSS transform tidak bekerja: pastikan `main.css` punya class `.wheel` dengan `transition: transform 0.8s ease-out`.

## Exit Criteria

- [ ] `src/components/Shell.tsx` — ada, CSS class names identik
- [ ] `src/components/Badge.tsx` — ada
- [ ] `src/components/TeamBadge.tsx` — ada
- [ ] `src/components/SpinWheel.tsx` — ada, menggunakan `useRef`
- [ ] `src/main.tsx` — import CSS, render App
- [ ] Browser menampilkan placeholder tanpa error console
