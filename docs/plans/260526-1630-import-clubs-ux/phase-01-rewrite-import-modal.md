# Phase 01: Rewrite openImportModal()

## Objective

Tulis ulang fungsi `openImportModal()` di `js/teams.js` untuk menghilangkan keempat friction point: tombol ekstra, search pasif, tidak ada pool-awareness, dan layout checkbox awkward.

## Scope

- Files/modules this phase may touch:
  - `js/teams.js` — fungsi `openImportModal()` (baris 107–182)
- Files/modules this phase must not touch:
  - `js/api.js`
  - `js/storage.js`
  - `js/ui.js`
  - Semua file HTML dan CSS

## Preconditions

- App berjalan di `http://localhost:4173` (atau port lain via `npm run preview` / `vite preview`)
- API key sudah dikonfigurasi di `settings.html` (required untuk fetch real)
- Setidaknya satu league ada di localStorage
- Ada minimal satu klub di pool (untuk test "In Pool" state)

## Tasks

### Task 1 — Baca kode existing dan identifikasi batas fungsi

Baca `js/teams.js` baris 107–182 untuk konfirmasi batas `openImportModal()` dan pattern yang dipakai.

Pastikan:
- `COMPETITIONS` di-import dari `./api.js`
- `fetchClubs` di-import dari `./api.js`
- `getAll(KEYS.teams)` tersedia untuk ambil pool existing
- `escapeHtml` tersedia dari `./ui.js`

### Task 2 — Tulis ulang markup modal

Ganti markup dalam `openImportModal()` dengan struktur baru:

```html
<div class="modal-card">
  <div class="modal-head">
    <h2>Import clubs</h2>
    <button class="btn" data-close type="button">Close</button>
  </div>
  <div class="modal-body list">
    <div class="form-grid">
      <div class="field">
        <label>Competition</label>
        <select id="competition">...</select>
      </div>
      <div class="field">
        <label>Search</label>
        <input id="clubSearch" placeholder="Club name">
      </div>
    </div>
    <!-- HAPUS: <button id="loadClubs"> -->
    <div id="clubList" class="list"></div>
    <!-- Footer sticky (hidden by default, shown via JS) -->
    <div id="importFooter" class="import-footer" style="display:none">
      <button id="addSelected" class="btn primary" type="button">Add 0 selected</button>
    </div>
  </div>
</div>
```

### Task 3 — Implementasi auto-load

Setelah modal di-render, langsung panggil `loadCompetition()` dengan value competition saat ini:

```js
async function loadCompetition(competitionId) {
  const list = modal.querySelector("#clubList");
  list.innerHTML = `<div class="empty">Loading clubs...</div>`;
  try {
    const clubs = await fetchClubs(competitionId);
    currentClubs = clubs;
    selectedIds.clear();
    updateFooter();
    renderClubs();
  } catch (error) {
    list.innerHTML = `
      <div class="empty">
        Failed to load: ${escapeHtml(error.message)}
        <button id="retryLoad" class="btn" type="button">Retry</button>
      </div>
    `;
    list.querySelector("#retryLoad")?.addEventListener("click", () => loadCompetition(competitionId));
  }
}

modal.querySelector("#competition").addEventListener("change", (e) => {
  loadCompetition(e.target.value);
});

loadCompetition(modal.querySelector("#competition").value); // auto-load on open
```

### Task 4 — Implementasi renderClubs() pool-aware

```js
function renderClubs() {
  const poolIds = new Set(
    getAll(KEYS.teams)
      .filter((t) => t.leagueId === league.id && t.externalId)
      .map((t) => t.externalId)
  );
  const term = modal.querySelector("#clubSearch")?.value.toLowerCase() ?? "";
  const filtered = currentClubs.filter((c) => c.name.toLowerCase().includes(term));

  if (!filtered.length) {
    list.innerHTML = `<div class="empty">No clubs match your search.</div>`;
    return;
  }

  const allInPool = filtered.every((c) => poolIds.has(c.id));
  if (allInPool) {
    list.innerHTML = `<div class="empty">All clubs already in your pool.</div>`;
    return;
  }

  list.innerHTML = filtered.map((club) => {
    const inPool = poolIds.has(club.id);
    const checked = selectedIds.has(club.id);
    return `
      <label class="list-row${inPool ? " muted" : ""}" style="${inPool ? "opacity:.45;pointer-events:none" : ""}">
        <input type="checkbox" name="club" value="${escapeHtml(club.id)}"
          ${checked ? "checked" : ""} ${inPool ? "disabled" : ""}>
        <span class="team-line">
          ${club.logo
            ? `<span class="team-badge"><img src="${escapeHtml(club.logo)}" alt=""></span>`
            : `<span class="team-badge">${escapeHtml(club.shortName)}</span>`}
          <span>${escapeHtml(club.name)}</span>
        </span>
        ${inPool ? `<span class="badge badge-pool">In pool</span>` : ""}
      </label>
    `;
  }).join("");

  // Pasang change listener untuk sync selectedIds
  list.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) selectedIds.add(cb.value);
      else selectedIds.delete(cb.value);
      updateFooter();
    });
  });
}
```

**Catatan:** `selectedIds` adalah `Set` yang hidup di closure `openImportModal()` dan di-clear saat competition berganti.

### Task 5 — Implementasi search debounce

```js
let searchTimeout;
modal.querySelector("#clubSearch").addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(renderClubs, 150);
});
```

### Task 6 — Implementasi "Select all visible" dan sticky footer

```js
function updateFooter() {
  const footer = modal.querySelector("#importFooter");
  const btn = modal.querySelector("#addSelected");
  const count = selectedIds.size;
  footer.style.display = count > 0 ? "block" : "none";
  btn.textContent = `Add ${count} selected`;
}
```

Tambah tombol "Select all" di atas list (opsional — skip jika class CSS belum ada, tidak menambah CSS baru):

```js
// Hanya jika ada klub yang belum di pool
const selectAllBtn = `<button id="selectAll" class="btn" type="button" style="margin-bottom:8px">Select all</button>`;
```

### Task 7 — Implementasi submit handler

```js
modal.querySelector("#addSelected").addEventListener("click", () => {
  selectedIds.forEach((id) => {
    const club = currentClubs.find((c) => c.id === id);
    if (!club) return;
    save(KEYS.teams, {
      leagueId: league.id,
      name: club.name,
      shortName: club.shortName,
      badge: club.logo || club.shortName,
      owner: null,
      status: "pool",
      externalId: club.id
    });
  });
  modal.className = "modal";
  render();
});
```

### Task 8 — Verifikasi manual golden path

Jalankan app dan buka `teams.html?league=<id>`:

1. Klik "Import clubs" → clubs Premier League langsung muncul tanpa klik tombol ✓
2. Ketik nama klub di search → filter real-time ✓
3. Klik area mana saja di row (bukan hanya checkbox) → ter-select, counter footer update ✓
4. Klub yang sudah di pool → dim, tidak bisa diklik ✓
5. Footer "Add N selected" muncul / hilang sesuai selection ✓
6. Ganti ke "Serie A" → list refresh, selection reset ✓
7. Putuskan koneksi / gunakan API key salah → pesan error + tombol Retry ✓
8. Klik "Add N selected" → modal tutup, klub muncul di Pool Referensi ✓

## Acceptance Criteria

- User-visible: semua 8 poin golden path di atas terpenuhi
- Required changed files: `js/teams.js` saja
- Required unchanged behavior:
  - Tombol "Spin wheel" tetap berfungsi
  - Form "Add team" manual tetap berfungsi
  - Cache API tetap dipakai (tidak ada extra fetch untuk kompetisi yang sama dalam 7 hari)

## Verification

- Commands:
  - `npm run preview` atau `vite preview` untuk serve app
  - Buka `http://localhost:4173/teams.html?league=<id>` di browser
- Expected results:
  - Tidak ada console error saat modal dibuka
  - Network tab menunjukkan hanya 1 fetch per competition (subsequent opens = cache)
- Evidence to record in `SUMMARY.md`:
  - Screenshot atau catatan: "8/8 golden path checks passed"

## Idempotence and Recovery

- Safe to re-run: ya — fungsi ini adalah UI renderer, tidak ada side effect permanen sampai user klik "Add selected"
- Recovery if interrupted: `git checkout js/teams.js` untuk kembali ke versi sebelumnya
- Rollback notes: tidak ada migration data, localStorage tidak terpengaruh

## Exit Criteria

- [ ] `openImportModal()` ditulis ulang tanpa tombol "Load clubs"
- [ ] Auto-load berjalan saat modal dibuka dan saat competition berubah
- [ ] Search real-time (debounce 150ms) berfungsi
- [ ] Klub yang sudah di pool di-dim dan disabled
- [ ] Checkbox di kiri, klik seluruh row = toggle
- [ ] Footer sticky counter update real-time
- [ ] Submit "Add N selected" menyimpan klub dan menutup modal
- [ ] Tidak ada console error
- [ ] 8/8 golden path manual checks passed
