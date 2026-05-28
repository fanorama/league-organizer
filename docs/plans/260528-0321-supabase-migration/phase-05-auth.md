# Phase 05: Auth — LoginPage + Shell

## Objective

Tambah halaman login admin, Zustand store untuk auth state, dan integrasi session di `Shell.tsx` + `App.tsx`.

## Scope

- Files/modules this phase may touch:
  - `src/store/useAuthStore.ts` (baru)
  - `src/pages/LoginPage.tsx` (baru)
  - `src/App.tsx`
  - `src/components/Shell.tsx`
- Files/modules this phase must not touch:
  - `src/lib/storage.ts`
  - Semua store lain
  - `src/lib/schedule.ts`

## Preconditions

- Phase 02 selesai: `src/lib/supabase.ts` ada
- Admin user sudah dibuat di Supabase (Phase 01)

## Tasks

### 1. Buat `src/store/useAuthStore.ts`

```ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  session: Session | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isAdmin: false,

  setSession: (session) => set({
    session,
    isAdmin: session !== null,
  }),
}));
```

### 2. Buat `src/pages/LoginPage.tsx`

Form sederhana: email + password, tombol Login.

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSession(data.session);
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Admin Login</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

### 3. Update `src/App.tsx`

Tambah:
- Import `useAuthStore`, `supabase`
- `useEffect` di root untuk init session + subscribe `onAuthStateChange`
- Route `/login` → `<LoginPage />`

```tsx
import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { LoginPage } from './pages/LoginPage';
// ... import pages lain ...

export default function App() {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [setSession]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LeaguesPage />} />
        {/* ... routes lain ... */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
```

### 4. Update `src/components/Shell.tsx`

Tambah tombol **Logout** dan nama "Admin" indicator jika `isAdmin`:

```tsx
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

// Di dalam ShellProps dan render:
const isAdmin = useAuthStore((s) => s.isAdmin);
const setSession = useAuthStore((s) => s.setSession);

const handleLogout = async () => {
  await supabase.auth.signOut();
  setSession(null);
};

// Di header, setelah nav:
{isAdmin && (
  <div className="admin-bar">
    <span className="admin-badge">Admin</span>
    <button onClick={handleLogout}>Logout</button>
  </div>
)}
```

## Acceptance Criteria

- `/login` route berfungsi
- Login dengan admin email+password berhasil → redirect ke `/`
- Session tersimpan di `useAuthStore`
- Shell menampilkan badge "Admin" + tombol Logout saat logged in
- Logout berhasil → `isAdmin` kembali `false`

## Verification

```bash
npm run dev
```

Manual test:
1. Buka `http://localhost:5173/#/login`
2. Login dengan admin credentials
3. Pastikan redirect ke `/` dan muncul badge "Admin" di header
4. Klik Logout, pastikan badge hilang

```bash
npm run build
```

Expected: TypeScript compile tanpa error.

## Idempotence and Recovery

- File baru bisa di-overwrite jika ada kesalahan
- Rollback: `git restore src/App.tsx src/components/Shell.tsx`

## Exit Criteria

- [ ] `useAuthStore.ts` terbuat
- [ ] `LoginPage.tsx` terbuat
- [ ] `App.tsx` diupdate dengan auth listener dan route `/login`
- [ ] `Shell.tsx` diupdate dengan admin badge + logout button
- [ ] Login manual berhasil di browser
- [ ] `npm run build` sukses
