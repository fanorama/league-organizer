# Generate Gambar Standings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambah tombol admin-only di tab Standings untuk meng-export klasemen musim menjadi gambar PNG 1:1 (template "Glow Poster") yang bisa diunduh dan dibagikan.

**Architecture:** Lapisan presentasi murni di atas `calculateStandingsFromData()` yang sudah ada. Sebuah komponen kartu off-screen (`StandingsImageCard`) di-render dengan ukuran natural 440×440 lalu di-"potret" jadi PNG via `html-to-image` pada `pixelRatio ≈ 2.4545` (output 1080×1080). Logo klub diambil lewat Vercel serverless proxy (`/api/crest`) untuk menembus batasan CORS; bila gagal, baris jatuh ke lingkaran inisial berwarna sehingga gambar selalu berhasil.

**Tech Stack:** React 18 + TypeScript + Vite + Zustand, `html-to-image` (baru), Vercel serverless function (`@vercel/node`), Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-30-generate-gambar-standings-design.md`
**Sumber kebenaran visual:** `docs/superpowers/specs/2026-05-30-standings-template-E.reference.html`

---

## File Structure

| File | Aksi | Tanggung jawab |
|------|------|----------------|
| `package.json` | Modify | Tambah dependency `html-to-image` |
| `src/lib/standingsImage.ts` | Create | Helper murni: `teamLogoUrl`, `proxiedLogoUrl`, `getInitials`, `getTeamColor`, `formatGoalDiff`, `latestMatchday` |
| `src/lib/standingsImage.test.ts` | Create | Unit test untuk helper murni |
| `api/crest.ts` | Create | Serverless proxy logo (CORS + normalisasi SVG→PNG) |
| `api/crest.test.ts` | Create | Unit test handler proxy |
| `src/lib/captureImage.ts` | Create | `captureCardToPng(node)` — wrapper `html-to-image` (tidak di-unit-test; butuh DOM/canvas) |
| `src/components/StandingsImageCard.tsx` | Create | Template visual E (off-screen, 440×440, style ter-scope) |
| `src/components/StandingsImageModal.tsx` | Create | Modal: orkestrasi capture, fallback logo, preview, tombol Unduh & Bagikan |
| `src/pages/SeasonPage.tsx` | Modify | Tambah tombol "Bagikan Gambar" (admin-only) + state modal di `StandingsTab` |
| `styles/main.css` | Modify | Gaya chrome modal + action bar standings |
| `vite.config.ts` | Modify | Tambah dev proxy `/api/crest` (paritas dengan `/api/football`) |

---

## Task 1: Tambah dependency `html-to-image`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install paket**

Run: `npm install html-to-image`
Expected: `package.json` `dependencies` bertambah `"html-to-image": "^1.11.13"` (versi minor boleh berbeda), `npm install` selesai tanpa error.

- [ ] **Step 2: Verifikasi build masih hijau**

Run: `npm run build`
Expected: build sukses (exit 0).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: tambah dependency html-to-image"
```

---

## Task 2: Helper murni `standingsImage.ts` (TDD)

**Files:**
- Create: `src/lib/standingsImage.ts`
- Test: `src/lib/standingsImage.test.ts`

- [ ] **Step 1: Tulis test yang gagal**

Buat `src/lib/standingsImage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Match, Team } from './types';
import {
  formatGoalDiff,
  getInitials,
  getTeamColor,
  latestMatchday,
  proxiedLogoUrl,
  teamLogoUrl,
} from './standingsImage';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return { id: 't1', leagueId: 'l1', name: 'Arsenal FC', status: 'active', ...overrides };
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return { id: 'm1', seasonId: 's1', matchday: 1, homeTeamId: 'a', awayTeamId: 'b', status: 'finished', ...overrides };
}

describe('teamLogoUrl', () => {
  it('mengembalikan URL dari badge bila berupa http(s)', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'https://crests.football-data.org/57.png' }))).toBe('https://crests.football-data.org/57.png');
  });
  it('jatuh ke logo bila badge bukan URL', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'ARS', logo: 'https://x/y.png' }))).toBe('https://x/y.png');
  });
  it('mengembalikan null bila tak ada URL', () => {
    expect(teamLogoUrl(makeTeam({ badge: 'ARS' }))).toBeNull();
  });
});

describe('proxiedLogoUrl', () => {
  it('membungkus url ke endpoint /api/crest dengan encoding', () => {
    expect(proxiedLogoUrl('https://crests.football-data.org/57.svg')).toBe('/api/crest?url=https%3A%2F%2Fcrests.football-data.org%2F57.svg');
  });
});

describe('getInitials', () => {
  it('memakai inisial dua kata pertama', () => {
    expect(getInitials(makeTeam({ name: 'Aston Villa' }))).toBe('AV');
  });
  it('memakai dua huruf pertama untuk satu kata', () => {
    expect(getInitials(makeTeam({ shortName: 'ARS', name: 'Arsenal' }))).toBe('AR');
  });
});

describe('getTeamColor', () => {
  it('deterministik untuk tim yang sama', () => {
    const team = makeTeam();
    expect(getTeamColor(team)).toBe(getTeamColor(team));
  });
  it('mengembalikan warna hex dari palet', () => {
    expect(getTeamColor(makeTeam())).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('formatGoalDiff', () => {
  it('memberi tanda + untuk positif', () => expect(formatGoalDiff(22)).toBe('+22'));
  it('apa adanya untuk nol', () => expect(formatGoalDiff(0)).toBe('0'));
  it('apa adanya untuk negatif', () => expect(formatGoalDiff(-9)).toBe('-9'));
});

describe('latestMatchday', () => {
  it('mengambil matchday tertinggi dari match liga yang selesai', () => {
    const matches = [
      makeMatch({ matchday: 1 }),
      makeMatch({ id: 'm2', matchday: 5 }),
      makeMatch({ id: 'm3', matchday: 9, status: 'scheduled' }),
      makeMatch({ id: 'm4', matchday: 12, matchType: 'playoff' }),
    ];
    expect(latestMatchday(matches, 's1')).toBe(5);
  });
  it('mengembalikan null bila belum ada yang selesai', () => {
    expect(latestMatchday([makeMatch({ status: 'scheduled' })], 's1')).toBeNull();
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:run -- src/lib/standingsImage.test.ts`
Expected: FAIL — modul `./standingsImage` belum ada.

- [ ] **Step 3: Implementasi minimal**

Buat `src/lib/standingsImage.ts`:

```ts
import type { Match, Team } from './types';

const LOGO_PALETTE = [
  '#dc2626', '#0ea5e9', '#16a34a', '#f59e0b', '#7c3aed',
  '#db2777', '#0891b2', '#ea580c', '#4f46e5', '#65a30d',
];

export function teamLogoUrl(team: Team): string | null {
  for (const value of [team.badge, team.logo]) {
    if (value && /^https?:\/\//.test(value)) return value;
  }
  return null;
}

export function proxiedLogoUrl(url: string): string {
  return `/api/crest?url=${encodeURIComponent(url)}`;
}

export function getInitials(team: Team): string {
  const source = (team.shortName || team.name || '?').trim();
  if (!source) return '?';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function getTeamColor(team: Team): string {
  const key = team.id || team.name || '';
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return LOGO_PALETTE[hash % LOGO_PALETTE.length];
}

export function formatGoalDiff(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

export function latestMatchday(matches: Match[], seasonId: string): number | null {
  const finished = matches.filter(
    (m) => m.seasonId === seasonId && m.status === 'finished' && (m.matchType || 'league') !== 'playoff',
  );
  if (finished.length === 0) return null;
  return Math.max(...finished.map((m) => m.matchday));
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:run -- src/lib/standingsImage.test.ts`
Expected: PASS (semua test hijau).

- [ ] **Step 5: Commit**

```bash
git add src/lib/standingsImage.ts src/lib/standingsImage.test.ts
git commit -m "feat: helper murni untuk gambar standings"
```

---

## Task 3: Serverless proxy logo `api/crest.ts` (TDD)

**Files:**
- Create: `api/crest.ts`
- Test: `api/crest.test.ts`

- [ ] **Step 1: Tulis test yang gagal**

Buat `api/crest.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './crest';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('crest proxy', () => {
  it('menolak ketika url tidak diberikan', async () => {
    const res = createResponse();
    await handler({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('menolak host di luar allowlist', async () => {
    const res = createResponse();
    await handler({ query: { url: 'https://evil.example.com/57.png' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('menukar .svg ke .png lalu meneruskan dengan header CORS', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = createResponse();

    await handler({ query: { url: 'https://crests.football-data.org/57.svg' } } as any, res as any);

    expect(fetchMock).toHaveBeenCalledWith('https://crests.football-data.org/57.png', expect.any(Object));
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npm run test:run -- api/crest.test.ts`
Expected: FAIL — modul `./crest` belum ada.

- [ ] **Step 3: Implementasi minimal**

Buat `api/crest.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_HOSTS = new Set(['crests.football-data.org']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.url;
  const target = Array.isArray(raw) ? raw[0] : raw;
  if (!target) return res.status(400).json({ error: 'Missing url parameter' });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(400).json({ error: 'Host not allowed' });
  }
  // Sibling .png selalu tersedia di CDN football-data; hindari rasterisasi SVG.
  if (parsed.pathname.endsWith('.svg')) {
    parsed.pathname = parsed.pathname.replace(/\.svg$/, '.png');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const upstream = await fetch(parsed.toString(), { signal: controller.signal });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream error' });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ error: 'Failed to fetch crest' });
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npm run test:run -- api/crest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/crest.ts api/crest.test.ts
git commit -m "feat: serverless proxy logo crest dengan normalisasi svg"
```

---

## Task 4: Dev proxy `/api/crest` di vite.config (paritas dev)

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Tambah plugin middleware**

Di `vite.config.ts`, tepat setelah objek plugin `football-api-dev-proxy` (di dalam array `plugins`), sisipkan plugin baru:

```ts
    {
      name: 'crest-dev-proxy',
      configureServer(server) {
        const ALLOWED_HOSTS = new Set(['crests.football-data.org']);
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/crest')) {
            next();
            return;
          }
          const target = new URL(req.url, 'http://localhost').searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          let parsed: URL;
          try {
            parsed = new URL(target);
          } catch {
            res.statusCode = 400;
            res.end('Invalid url');
            return;
          }
          if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
            res.statusCode = 400;
            res.end('Host not allowed');
            return;
          }
          if (parsed.pathname.endsWith('.svg')) {
            parsed.pathname = parsed.pathname.replace(/\.svg$/, '.png');
          }
          const upstream = await fetch(parsed.toString());
          res.statusCode = upstream.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('content-type', upstream.headers.get('content-type') || 'image/png');
          res.end(Buffer.from(await upstream.arrayBuffer()));
        });
      },
    },
```

- [ ] **Step 2: Verifikasi proxy dev bekerja**

Run (jalankan dev server lalu uji endpoint):
```bash
npm run dev &
sleep 4
curl -s -o /tmp/crest.png -w "%{http_code} %{content_type}\n" "http://localhost:5173/api/crest?url=https%3A%2F%2Fcrests.football-data.org%2F57.svg"
kill %1
```
Expected: `200 image/png` dan `/tmp/crest.png` berukuran > 0 byte.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: dev proxy /api/crest untuk paritas vite dev"
```

---

## Task 5: Komponen kartu `StandingsImageCard.tsx`

**Files:**
- Create: `src/components/StandingsImageCard.tsx`

> Reproduksi persis gaya dari `docs/superpowers/specs/2026-05-30-standings-template-E.reference.html`. Sorotan juara dibuat sebagai elemen `<i class="sic-champ">` (bukan `::before`) agar capture `html-to-image` andal.

- [ ] **Step 1: Buat komponen**

Buat `src/components/StandingsImageCard.tsx`:

```tsx
import type { Ref } from 'react';
import type { StandingsRow } from '../lib/standings';
import { formatGoalDiff, getInitials, getTeamColor, proxiedLogoUrl, teamLogoUrl } from '../lib/standingsImage';

const STYLE = `
.sic { width:440px; height:440px; border-radius:8px; overflow:hidden; position:relative;
  font-family:'Helvetica Neue',Arial,sans-serif; color:#fff;
  background: radial-gradient(90% 70% at 85% 110%, #8b5cf6 0%, #5b21b6 28%, transparent 60%),
              linear-gradient(155deg,#0b0612 0%, #1a0f2e 55%, #0a0510 100%); }
.sic * { box-sizing:border-box; }
.sic-glow { position:absolute; inset:0; background:radial-gradient(60% 40% at 12% 0%, rgba(139,92,246,.25), transparent 60%); }
.sic-wrap { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:26px 28px 20px; }
.sic-titlewrap { margin-bottom:14px; }
.sic-kick { font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#c4b5fd; font-weight:700; }
.sic-big { font-size:27px; font-weight:800; line-height:1; letter-spacing:-.3px; text-transform:uppercase; margin-top:6px; }
.sic-sub { font-size:11px; letter-spacing:1px; color:rgba(255,255,255,.55); margin-top:7px; }
.sic-colhead { display:flex; align-items:center; font-size:9px; letter-spacing:2px; color:rgba(255,255,255,.42); text-transform:uppercase; padding:0 4px 8px; }
.sic-colhead .sic-nm{flex:1} .sic-colhead .sic-st{width:36px;text-align:center} .sic-colhead .sic-pt{width:44px;text-align:right}
.sic-colhead .sic-rk{width:28px} .sic-colhead .sic-lg{width:32px}
.sic-list { flex:1; display:flex; flex-direction:column; }
.sic-r { display:flex; align-items:center; flex:1; padding:0 4px; position:relative; }
.sic-r > span { position:relative; z-index:1; }
.sic-champ { position:absolute; inset:0 -10px; z-index:0; border-radius:4px;
  background:linear-gradient(90deg, rgba(139,92,246,.26), rgba(139,92,246,0)); }
.sic-rk { width:28px; font-weight:800; font-size:17px; color:rgba(255,255,255,.85); }
.sic-lg { width:24px; height:24px; border-radius:50%; margin-right:13px; flex:none;
  display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; overflow:hidden; }
.sic-lg img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
.sic-nm { flex:1; font-weight:700; font-size:15px; letter-spacing:.3px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sic-st { width:36px; text-align:center; font-size:14px; color:rgba(255,255,255,.7); }
.sic-pt { width:44px; text-align:right; font-weight:800; font-size:18px; }
.sic-r.sic-first .sic-pt { color:#ddd6fe; }
.sic-credit { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,.4); margin-top:10px; text-align:right; }
`;

interface StandingsImageCardProps {
  rows: StandingsRow[];
  leagueName: string;
  seasonNumber: number;
  matchday: number | null;
  dateLabel: string;
  failedLogos: Set<string>;
  onLogoSettled: (teamId: string) => void;
  onLogoError: (teamId: string) => void;
  innerRef?: Ref<HTMLDivElement>;
}

export function StandingsImageCard({
  rows, leagueName, seasonNumber, matchday, dateLabel,
  failedLogos, onLogoSettled, onLogoError, innerRef,
}: StandingsImageCardProps) {
  return (
    <div className="sic" ref={innerRef}>
      <style>{STYLE}</style>
      <div className="sic-glow" />
      <div className="sic-wrap">
        <div className="sic-titlewrap">
          <div className="sic-kick">Klasemen · Musim {seasonNumber}</div>
          <div className="sic-big">{leagueName}</div>
          <div className="sic-sub">{matchday !== null ? `Pekan ${matchday} — ${dateLabel}` : dateLabel}</div>
        </div>
        <div className="sic-colhead">
          <span className="sic-rk" /><span className="sic-lg" /><span className="sic-nm">Tim</span>
          <span className="sic-st">M</span><span className="sic-st">SG</span><span className="sic-pt">Pts</span>
        </div>
        <div className="sic-list">
          {rows.map((row, index) => {
            const url = teamLogoUrl(row.team);
            const showImg = url !== null && !failedLogos.has(row.team.id);
            return (
              <div className={`sic-r${index === 0 ? ' sic-first' : ''}`} key={row.team.id}>
                {index === 0 && <i className="sic-champ" />}
                <span className="sic-rk">{index + 1}</span>
                <span className="sic-lg" style={{ background: showImg ? 'transparent' : getTeamColor(row.team) }}>
                  {showImg ? (
                    <img
                      src={proxiedLogoUrl(url as string)}
                      crossOrigin="anonymous"
                      alt=""
                      onLoad={() => onLogoSettled(row.team.id)}
                      onError={() => { onLogoError(row.team.id); onLogoSettled(row.team.id); }}
                    />
                  ) : getInitials(row.team)}
                </span>
                <span className="sic-nm">{row.team.name}</span>
                <span className="sic-st">{row.played}</span>
                <span className="sic-st">{formatGoalDiff(row.gd)}</span>
                <span className="sic-pt">{row.pts}</span>
              </div>
            );
          })}
        </div>
        <div className="sic-credit">Fanorama League</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `npm run build`
Expected: `tsc -b` lolos tanpa error tipe, build sukses.

- [ ] **Step 3: Commit**

```bash
git add src/components/StandingsImageCard.tsx
git commit -m "feat: komponen kartu gambar standings (template E)"
```

---

## Task 6: Wrapper capture `captureImage.ts`

**Files:**
- Create: `src/lib/captureImage.ts`

- [ ] **Step 1: Buat wrapper**

Buat `src/lib/captureImage.ts`:

```ts
import { toPng } from 'html-to-image';

const OUTPUT_SIZE = 1080;

// Kartu di-render pada ukuran natural 440x440; pixelRatio menaikkan ke 1080x1080
// dengan proporsi identik dengan referensi yang disetujui.
export async function captureCardToPng(node: HTMLElement): Promise<string> {
  const natural = node.offsetWidth || 440;
  return toPng(node, {
    pixelRatio: OUTPUT_SIZE / natural,
    cacheBust: true,
  });
}
```

- [ ] **Step 2: Verifikasi build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 3: Commit**

```bash
git add src/lib/captureImage.ts
git commit -m "feat: wrapper capture html-to-image untuk kartu standings"
```

---

## Task 7: Modal `StandingsImageModal.tsx`

**Files:**
- Create: `src/components/StandingsImageModal.tsx`

> Logika fallback: kartu di-render off-screen. Setiap logo memicu `onLogoSettled` saat `load`/`error`. Saat semua logo settled (atau tak ada logo), capture dijalankan. Logo yang `error` ditandai di `failedLogos` → kartu render ulang sebagai inisial sebelum capture.

- [ ] **Step 1: Buat modal**

Buat `src/components/StandingsImageModal.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StandingsRow } from '../lib/standings';
import { captureCardToPng } from '../lib/captureImage';
import { teamLogoUrl } from '../lib/standingsImage';
import { StandingsImageCard } from './StandingsImageCard';

interface StandingsImageModalProps {
  rows: StandingsRow[];
  leagueName: string;
  seasonNumber: number;
  matchday: number | null;
  dateLabel: string;
  onClose: () => void;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'liga';
}

export function StandingsImageModal({
  rows, leagueName, seasonNumber, matchday, dateLabel, onClose,
}: StandingsImageModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [settled, setSettled] = useState(0);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const capturedRef = useRef(false);

  const totalLogos = useMemo(() => rows.filter((r) => teamLogoUrl(r.team)).length, [rows]);

  const handleSettled = useCallback(() => setSettled((c) => c + 1), []);
  const handleError = useCallback((id: string) => {
    setFailedLogos((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const runCapture = useCallback(async () => {
    setStatus('loading');
    try {
      if (!cardRef.current) throw new Error('Kartu belum siap');
      if (document.fonts?.ready) await document.fonts.ready;
      const url = await captureCardToPng(cardRef.current);
      setPngUrl(url);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (capturedRef.current) return undefined;
    if (settled < totalLogos) return undefined;
    capturedRef.current = true;
    // beri satu tick agar fallback inisial sempat ter-render sebelum capture
    const timer = setTimeout(runCapture, 50);
    return () => clearTimeout(timer);
  }, [settled, totalLogos, runCapture]);

  function handleDownload() {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `klasemen-${slugify(leagueName)}-musim-${seasonNumber}.png`;
    a.click();
  }

  async function handleShare() {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      const file = new File([blob], `klasemen-musim-${seasonNumber}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Klasemen ${leagueName}` });
      }
    } catch {
      /* dibatalkan pengguna atau tidak didukung */
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  return (
    <div className="std-image-overlay" role="dialog" aria-modal="true" aria-label="Bagikan gambar klasemen">
      <div style={{ position: 'fixed', left: -10000, top: 0, width: 440, height: 440, pointerEvents: 'none' }} aria-hidden>
        <StandingsImageCard
          innerRef={cardRef}
          rows={rows}
          leagueName={leagueName}
          seasonNumber={seasonNumber}
          matchday={matchday}
          dateLabel={dateLabel}
          failedLogos={failedLogos}
          onLogoSettled={handleSettled}
          onLogoError={handleError}
        />
      </div>

      <div className="std-image-modal">
        <header className="std-image-head">
          <h3>Bagikan Klasemen</h3>
          <button className="btn" type="button" onClick={onClose}>Tutup</button>
        </header>
        <div className="std-image-preview">
          {status === 'loading' && <div className="std-image-state">Membuat gambar…</div>}
          {status === 'error' && (
            <div className="std-image-state">
              Gagal membuat gambar.{' '}
              <button className="btn btn-xs" type="button" onClick={runCapture}>Coba lagi</button>
            </div>
          )}
          {status === 'ready' && pngUrl && <img src={pngUrl} alt="Pratinjau klasemen" />}
        </div>
        <footer className="std-image-actions">
          <button className="btn primary" type="button" disabled={status !== 'ready'} onClick={handleDownload}>Unduh</button>
          {canShare && (
            <button className="btn" type="button" disabled={status !== 'ready'} onClick={handleShare}>Bagikan</button>
          )}
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi build**

Run: `npm run build`
Expected: sukses tanpa error tipe.

- [ ] **Step 3: Commit**

```bash
git add src/components/StandingsImageModal.tsx
git commit -m "feat: modal preview + unduh/bagikan gambar standings"
```

---

## Task 8: Gaya CSS modal & action bar

**Files:**
- Modify: `styles/main.css`

- [ ] **Step 1: Tambah CSS di akhir `styles/main.css`**

```css
/* === Standings image modal === */
.standings-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 0;
}
.std-image-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.std-image-modal {
  background: #fff;
  border-radius: 12px;
  width: min(420px, 100%);
  max-height: 90vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.std-image-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #e8edf3;
}
.std-image-head h3 { margin: 0; font-size: 16px; }
.std-image-preview {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}
.std-image-preview img {
  width: 100%;
  max-width: 360px;
  height: auto;
  border-radius: 8px;
}
.std-image-state { color: #475569; font-size: 14px; text-align: center; }
.std-image-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 0 16px 16px;
}
```

- [ ] **Step 2: Verifikasi build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 3: Commit**

```bash
git add styles/main.css
git commit -m "style: gaya modal gambar standings"
```

---

## Task 9: Integrasi tombol di `StandingsTab` (SeasonPage)

**Files:**
- Modify: `src/pages/SeasonPage.tsx`

- [ ] **Step 1: Tambah import**

Di blok import atas `src/pages/SeasonPage.tsx`, tambahkan setelah baris import `calculateStandingsFromData`:

```tsx
import { StandingsImageModal } from '../components/StandingsImageModal';
import { latestMatchday } from '../lib/standingsImage';
```

- [ ] **Step 2: Teruskan `league` & `isAdmin` ke `StandingsTab`**

Ganti pemanggilan `StandingsTab` (baris ~137) menjadi:

```tsx
{safeActiveTab === 'standings' ? <StandingsTab season={currentSeason} teams={teams} matches={matches} league={currentLeague} isAdmin={isAdmin} /> : null}
```

- [ ] **Step 3: Perbarui definisi `StandingsTab`**

Ganti fungsi `StandingsTab` (mulai baris ~276) menjadi:

```tsx
function StandingsTab({ season, teams, matches, league, isAdmin }: { season: Season; teams: Team[]; matches: Match[]; league: League; isAdmin: boolean }) {
  const rows = calculateStandingsFromData(season, teams, matches);
  const [showImage, setShowImage] = useState(false);

  return (
    <section className="panel">
      {isAdmin ? (
        <div className="standings-actions">
          <button className="btn primary" type="button" onClick={() => setShowImage(true)}>Bagikan Gambar</button>
        </div>
      ) : null}
      <div className="panel-body" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Owner</th>
              <th className="center">P</th>
              <th className="center">W</th>
              <th className="center">D</th>
              <th className="center">L</th>
              <th className="center">GF</th>
              <th className="center">GA</th>
              <th className="center">GD</th>
              <th className="center">Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.team.id}>
                <td>{index + 1}</td>
                <td>
                  <div className="team-line">
                    <TeamBadge team={row.team} />
                    <span className="team-name">{row.team.name}</span>
                  </div>
                </td>
                <td>{getSeasonOwnerName(season, row.team.id)}</td>
                <td className="center">{row.played}</td>
                <td className="center">{row.won}</td>
                <td className="center">{row.drawn}</td>
                <td className="center">{row.lost}</td>
                <td className="center">{row.gf}</td>
                <td className="center">{row.ga}</td>
                <td className="center">{row.gd}</td>
                <td className="center">
                  <strong>{row.pts}</strong>
                </td>
                <td>{row.form.join(' ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showImage ? (
        <StandingsImageModal
          rows={rows}
          leagueName={league.name}
          seasonNumber={season.number}
          matchday={latestMatchday(matches, season.id)}
          dateLabel={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          onClose={() => setShowImage(false)}
        />
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Verifikasi build & test penuh**

Run: `npm run build && npm run test:run`
Expected: build sukses; seluruh test (lama + baru) PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/SeasonPage.tsx
git commit -m "feat: tombol bagikan gambar klasemen (admin) di tab standings"
```

---

## Task 10: Verifikasi manual di browser

**Files:** (tidak ada perubahan; verifikasi)

- [ ] **Step 1: Jalankan dev server**

Run: `npm run dev`
Buka `http://localhost:5173`, login sebagai admin, masuk ke sebuah liga → musim dengan minimal beberapa match selesai → tab **Standings**.

- [ ] **Step 2: Periksa checklist visual**

- [ ] Tombol **"Bagikan Gambar"** muncul (hanya saat login admin; logout → tombol hilang).
- [ ] Klik tombol → modal terbuka, sempat menampilkan "Membuat gambar…", lalu muncul pratinjau gambar 1:1.
- [ ] Gambar sesuai template E: gradasi hitam→ungu, juara (peringkat 1) tersorot, kolom M · SG · Pts, semua tim muat tanpa terpotong, sudut membulat halus (8px).
- [ ] Logo klub (untuk tim hasil import) tampil; tim tanpa logo URL tampil sebagai lingkaran inisial berwarna.
- [ ] Header menampilkan "KLASEMEN · MUSIM n", nama liga, dan "Pekan {n} — {tanggal}".
- [ ] Tombol **Unduh** menyimpan file PNG; bila perangkat mendukung Web Share, tombol **Bagikan** muncul dan berfungsi.

- [ ] **Step 3: Periksa fallback logo**

Matikan koneksi/aktifkan throttling ekstrem lalu buka modal: logo gagal harus otomatis menjadi inisial, dan gambar tetap berhasil dibuat.

- [ ] **Step 4: Commit (bila ada perbaikan)**

Jika langkah verifikasi memunculkan perbaikan kecil, perbaiki lalu commit dengan pesan deskriptif. Bila tidak ada perubahan, lewati.

---

## Catatan

- **Dev server** (`npm run dev`) kini melayani `/api/crest` lewat middleware vite (Task 4); di produksi dilayani `api/crest.ts` (Vercel function). Keduanya menjaga logika sama (allowlist host + normalisasi SVG→PNG).
- Tidak ada perubahan skema Supabase, tidak ada logika klasemen baru.
- Optimal untuk liga ≤ ~12 tim; baris memakai `flex` sehingga auto-fit.
```
