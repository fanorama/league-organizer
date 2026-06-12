# Documentation Summary

**League Organizer** — aplikasi web multi-liga untuk mengelola turnamen sepak bola game (skor manual): klasemen, statistik player, spin wheel pengundian klub, playoff, quick match, dan **competition** (turnamen Group + Knockout bergaya Piala Dunia/Euro/UCL).
Stack: **React 18 + TypeScript + Vite + Zustand + React Router v6 (HashRouter)**, backend **Supabase (PostgreSQL + Auth)**, import klub dari **football-data.org** via proxy serverless, deploy di **Vercel**. Tidak ada server aplikasi custom.

## Agent Context Guide

Before planning or implementing, read this `docs/SUMMARY.md` file first. Load only the detail docs relevant to the current task, and prioritize `Code Standard` docs for implementation conventions. If docs conflict with code or user intent, use the available question tool before making broad changes.

## Architecture

System design, alur data, integrasi eksternal, dan deployment.

| File | Description |
| ---- | ----------- |
| [architecture/system-overview.md](architecture/system-overview.md) | Lapisan UI → Store → Storage → Supabase, auth, proxy football-data.org, deployment Vercel |
| [architecture/domain-flows.md](architecture/domain-flows.md) | Siklus hidup liga, penjadwalan & playoff, klasemen, statistik player, quick match, competition |

## Codebase

Struktur direktori, entry point, routing, dan modul utama.

| File | Description |
| ---- | ----------- |
| [codebase/directory-structure.md](codebase/directory-structure.md) | Pohon direktori, entry point, tabel routing, lokasi test |
| [codebase/key-modules.md](codebase/key-modules.md) | Tanggung jawab tiap modul `lib/`, store, komponen, dan serverless `api/` |

## Code Standard

Konvensi, pola kode, tech stack, dan workflow pengembangan.

| File | Description |
| ---- | ----------- |
| [code-standard/conventions.md](code-standard/conventions.md) | Aturan storage layer, mapper snake_case↔camelCase, pola store, design token CSS |
| [code-standard/development-workflow.md](code-standard/development-workflow.md) | Setup, env vars, perintah npm, testing (mock Supabase), cara menambah fitur |

## Project PDR

Tujuan produk, use case, dan aturan bisnis.

| File | Description |
| ---- | ----------- |
| [project-pdr/product-goals.md](project-pdr/product-goals.md) | Apa ini, pengguna (admin vs pengunjung), use case utama |
| [project-pdr/business-rules.md](project-pdr/business-rules.md) | Aturan ownership, spin wheel, musim/playoff, otorisasi, fitur terencana |

## Other

Spec desain & plan implementasi bertanggal (di luar 4 folder topik standar).

| File | Description |
| ---- | ----------- |
| [SCHEMA.md](SCHEMA.md) | SQL DDL semua tabel Supabase + indexes + RLS policies (siap execute di SQL Editor) |
| `docs/superpowers/specs/` | Design spec bertanggal (Supabase migration, import grid, football proxy, tier klub & balanced draw) |
| `docs/plans/` | Plan implementasi bertahap (Supabase migration, tier klub & balanced draw) |
