# Product Goals & Use Cases

## Apa Ini

League Organizer adalah aplikasi web **multi-liga** untuk mengelola turnamen sepak bola yang dimainkan via video game (skor diinput manual). Konteksnya skala kecil: **grup teman yang main game bola bersama**, ingin menyelenggarakan liga/turnamen rapi dengan klasemen, statistik, dan playoff.

Satu instance dapat menampung banyak liga sekaligus. Player bersifat global (lintas liga), sementara tim dimiliki per liga.

## Pengguna

| Peran | Kemampuan |
|-------|-----------|
| **Admin** (login Supabase Auth) | Membuat & mengelola liga, player, tim, musim; input skor; menjalankan spin wheel & playoff |
| **Pengunjung** (tanpa login) | Melihat semua data secara **read-only** (klasemen, statistik, jadwal) |

Tidak ada self-service registration — admin adalah penyelenggara liga.

## Use Case Utama

1. **Menyelenggarakan liga musiman** — buat liga, undi klub ke player, generate jadwal round-robin, input skor sampai juara ditentukan.
2. **Pengundian klub yang seru** — spin wheel meng-assign klub pool ke player secara acak (mengganti pemilihan manual).
3. **Import klub nyata** — ambil daftar klub asli (logo, nama) dari kompetisi populer (Premier League, Serie A, La Liga/Eredivisie, Bundesliga, Ligue 1, dll.) lewat football-data.org.
4. **Playoff** — opsional, format double-elimination setelah liga reguler selesai.
5. **Statistik & rivalitas** — leaderboard player global, profil per player (stats per liga), dan head-to-head antar player.
6. **Quick Match** — sesi pertandingan cepat antar dua player di luar struktur liga, dengan pemilihan klub bebas dan rekap statistik sendiri.

## Filosofi

- **Ringan, tanpa friksi.** Tidak ada server aplikasi custom; backend = Supabase, hosting = Vercel.
- **Data nyata, terasa otentik.** Klub asli dengan logo membuat liga terasa seperti turnamen sungguhan.
- **Fokus penyelenggara.** Write dibatasi ke admin; semua orang lain bisa memantau.
