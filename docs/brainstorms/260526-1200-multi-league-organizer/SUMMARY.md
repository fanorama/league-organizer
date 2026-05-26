# Brainstorm: Multi-League Organizer

**Date:** 2026-05-26  
**Status:** Design Complete — Ready for Implementation  
**Topic:** Redesign dari prototype HTML statis satu liga ke sistem multi-liga penuh

---

## Problem Statement

App saat ini (`index.html`, `schedule.html`, `standings.html`) adalah prototype statis satu liga dengan data hardcoded. Tidak ada state management, tidak bisa membuat lebih dari satu liga, dan tidak ada interaktivitas nyata.

Dibutuhkan redesign penuh menjadi app yang bisa:
- Mengelola banyak liga independen
- Tiap liga punya tim, jadwal, klasemen, dan multi-season
- Tim bisa di-assign ke pemilik nyata via spinning wheel
- Import klub dari API liga Eropa
- Jadwal di-generate otomatis dan terkunci saat season dimulai

---

## Goals

- Buat, kelola, dan arsipkan banyak liga
- Konfigurasi season per liga (berapa kali pertemuan, single/multi-season)
- Jadwal ter-generate dan ter-randomize sebelum musim mulai, terkunci saat mulai
- Input hasil pertandingan → klasemen otomatis update
- Delay match jika tim berhalangan
- Spinning wheel untuk assign pemilik ke klub secara random
- Import klub nyata dari API (top 5 liga Eropa) dengan caching

---

## Keputusan Teknis

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Tech stack | Vanilla JS + localStorage | Design-first, tanpa backend |
| User mode | Single-user | Tidak perlu auth/login |
| Arsitektur | Multi-page HTML + shared JS modules | Maintainable, familiar |
| Wheel placement | Modal di teams.html | Tidak perlu halaman tersendiri |
| API caching | localStorage, 7-hari TTL | Limit 100 req/day |
| File lama | Dihapus seluruhnya | Mulai fresh |

---

## Struktur Halaman

```
leagues.html              ← Home: list semua liga
league.html?id=xxx        ← Detail liga: seasons, settings  
teams.html?league=xxx     ← Kelola tim + wheel + import API
season.html?id=xxx        ← Jadwal matchday + klasemen
settings.html             ← API key, cache management
```

---

## Sections

- [Data Model & Schema](section-01-data-model.md) — localStorage schema, entity types
- [Season Logic & Algorithms](section-02-season-logic.md) — lifecycle, schedule generation, delay
- [Implementation Plan](section-03-implementation-plan.md) — sprint breakdown, UI components, edge cases

---

## Execution Status

- [-] Sprint 1 — Foundation
- [ ] Sprint 2 — Settings & Teams
- [ ] Sprint 3 — League & Season Setup
- [ ] Sprint 4 — Match Management
- [ ] Sprint 5 — Polish

## Progress

- 2026-05-26 14:03:24 WIB — Started Batch execution. Plan path verified, section docs loaded, Sprint 1 marked in progress.

## Surprises & Discoveries

- None yet.

## Decision Log

- 2026-05-26 14:03:24 WIB — Treat sprint checklist plus Golden Path manual verification as the acceptance baseline because the brainstorm plan has concrete file targets and observable behavior, but no separate command matrix.

## Outcomes & Retrospective

- Pending.

---

## Non-Goals

- Backend / server
- Multi-user / login
- Player management (roster, statistik individu)
- Mobile native app
