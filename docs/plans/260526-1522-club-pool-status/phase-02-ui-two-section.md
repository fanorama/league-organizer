# Phase 02: UI Two-Section Layout

## Objective

Halaman `teams.html` menampilkan dua section terpisah:
- **Peserta Liga** — klub ber-status `'active'` (sudah punya owner, ikut season)
- **Pool Referensi** — klub ber-status `'pool'` (belum di-spin, cadangan)

## Scope

- Files yang boleh diubah: `js/teams.js`
- Files yang tidak boleh disentuh: `js/wheel.js`, `js/league.js`, `js/season.js`

## Preconditions

- Phase 01 selesai: `status` sudah tersimpan di localStorage

## Tasks

### 1. Split query di `render()`

**Lokasi:** `js/teams.js` baris ~14

Ubah:
```js
const teams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id);
```

Menjadi:
```js
const allTeams = getAll(KEYS.teams).filter((team) => team.leagueId === league.id);
const activeTeams = allTeams.filter((team) => team.status === 'active');
const poolTeams = allTeams.filter((team) => team.status === 'pool');
```

### 2. Update `wheelButton` disabled condition

**Lokasi:** `js/teams.js` dalam `app.innerHTML` template

Ubah kondisi disabled:
```js
${poolTeams.some((team) => !team.owner) ? "" : "disabled"}
```

Menjadi lebih eksplisit:
```js
${poolTeams.length > 0 ? "" : "disabled"}
```

### 3. Restructure panel-body: dua section

Ganti seluruh blok `panel-body` dari satu list menjadi dua sub-section:

```html
<div class="panel-body">
  <!-- Section: Peserta Liga -->
  <div class="section-head muted">Peserta Liga (${activeTeams.length})</div>
  ${activeTeams.length ? `<div class="list">${activeTeams.map((team) => `
    <div class="list-row">
      <div class="team-line">
        ${teamBadge(team)}
        <div>
          <div class="team-name">${escapeHtml(team.name)}</div>
          <div class="muted">${escapeHtml(team.shortName)} · owner: ${escapeHtml(team.owner || "unassigned")}</div>
        </div>
      </div>
      ${badge("assigned")}
    </div>
  `).join("")}</div>` : `<div class="muted" style="padding:8px 0">Belum ada peserta. Spin wheel untuk memilih.</div>`}

  <!-- Section: Pool Referensi -->
  <div class="section-head muted" style="margin-top:16px">Pool Referensi (${poolTeams.length})</div>
  ${poolTeams.length ? `<div class="list">${poolTeams.map((team) => `
    <div class="list-row">
      <div class="team-line">
        ${teamBadge(team)}
        <div>
          <div class="team-name">${escapeHtml(team.name)}</div>
          <div class="muted">${escapeHtml(team.shortName)} · pool</div>
        </div>
      </div>
      ${badge("")}
    </div>
  `).join("")}</div>` : `<div class="muted" style="padding:8px 0">Pool kosong. Import atau tambah klub.</div>`}
</div>
```

**Catatan implementasi:**
- Hapus variabel `teams` lama, ganti dengan `allTeams`, `activeTeams`, `poolTeams`
- Referensi ke `teams` di wheelButton handler (dari Phase 01) sudah pakai `poolTeams` — pastikan konsisten
- `badge("")` untuk pool club menghasilkan badge kosong/netral (sesuai UI existing)

### 4. Update empty state global

Ganti empty state dari:
```js
`<div class="empty">No teams yet. Add teams manually or import clubs.</div>`
```

Menjadi kondisi berdasarkan `allTeams.length`:
```js
allTeams.length === 0 ? `<div class="empty">No teams yet. Add teams manually or import clubs.</div>` : ""
```

Artinya: jika `allTeams` tidak kosong, dua sub-section sudah dirender di atas.

## Acceptance Criteria

- Import 3 klub → muncul di "Pool Referensi (3)", "Peserta Liga (0)"
- Spin + assign 1 klub → "Pool Referensi (2)", "Peserta Liga (1)"
- Pool habis → "Pool Referensi (0)" dengan empty state, Spin button disabled
- `allTeams` kosong → tampil empty state global

## Verification

- Commands:
  - Buka `http://localhost:4173/teams.html?league=<id>`
  - Amati section headers dan hitungan bracket
- Expected results:
  - Dua section terlihat dengan label dan count
  - Klub active ada di Peserta, klub pool ada di Pool
  - Spin button disabled saat pool kosong
- Evidence: screenshot `teams.html` setelah import dan setelah spin

## Idempotence and Recovery

- Safe to re-run: ya — pure UI, tidak ada side effect storage
- Recovery: revert `js/teams.js`

## Exit Criteria

- [ ] Dua section tampil dengan label dan count yang benar
- [ ] Klub status `'pool'` ada di Pool section
- [ ] Klub status `'active'` ada di Peserta section
- [ ] Spin button disabled saat tidak ada pool clubs
- [ ] Empty state global tampil saat tidak ada klub sama sekali
