# Brainstorm: Club Pool vs Peserta Aktif (Spin Wheel)

**Date:** 2026-05-26  
**Status:** Design Complete — Ready for Implementation  
**Topic:** Pemisahan "pool referensi klub" dari "peserta aktif liga" untuk spin wheel

---

## Problem Statement

Desain awal mengasumsikan semua klub di `teams.html` adalah peserta liga. Namun kenyataannya, user ingin mengimpor banyak klub sebagai pool referensi, lalu hanya sebagian yang akan bermain — ditentukan secara acak via spin wheel.

---

## Goals

- Klub bisa di-import/tambah ke pool tanpa langsung jadi peserta liga
- Spin wheel beroperasi hanya dari klub di pool (belum di-assign)
- Tiap putaran: wheel berhenti → input nama pemilik → klub + owner masuk sebagai peserta aktif
- Wheel semakin mengecil tiap putaran (klub terpilih tidak muncul lagi)
- Season hanya menggunakan peserta aktif
- Sisa klub di pool yang tidak terpilih tetap ada (tidak masuk jadwal)

---

## Keputusan Teknis

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Pendekatan | Status flag pada `Team` | Perubahan minimal, zero entitas baru |
| Field baru | `status: 'pool' \| 'active'` | Cukup untuk membedakan pool vs peserta |
| Default saat import | `status: 'pool'` | Tidak ada asumsi otomatis masuk liga |
| Scope pool | Per-liga | Tiap liga kelola poolnya sendiri |
| Wheel candidates | `teams.filter(status === 'pool')` | Hanya yang belum di-assign |

---

## Flow Spin Wheel (Baru)

```
[Import/Tambah Klub] → status: 'pool'
         ↓
[Spin Wheel Modal] → berisi klub status: 'pool' saja
         ↓
[Wheel berhenti di Klub X] → prompt: "Nama pemilik?"
         ↓
[Input nama] → Klub X: status: 'active', owner: 'Nama'
         ↓
[Ulangi] → pool mengecil tiap putaran
         ↓
[Season] → hanya pakai status: 'active'
```

---

## Sections

- [Data Model Update](section-01-data-model-update.md) — Perubahan `Team` entity: tambah `status` field
- [UI Flow & Edge Cases](section-02-ui-flow.md) — UI states, wheel logic, edge cases

---

## Non-Goals

- Validasi minimum peserta ada di "Start Season", bukan di tahap spin
- Pool clubs tidak bisa langsung jadi peserta tanpa spin (harus lewat wheel)
- Tidak ada fitur "skip spin, pilih manual" dalam scope ini
