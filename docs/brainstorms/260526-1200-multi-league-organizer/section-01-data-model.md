# Section 01 — Data Model & localStorage Schema

## Storage Keys

```
localStorage:
  "app_settings"  → Settings
  "leagues"       → League[]
  "teams"         → Team[]
  "seasons"       → Season[]
  "matches"       → Match[]
  "clubs_cache"   → ClubsCache
```

---

## Entity Schemas

### Settings
```js
{
  apiKey: string     // API key untuk football data provider
}
```

### League
```js
{
  id: string,            // UUID
  name: string,
  description: string,
  createdAt: string,     // ISO date
  settings: {
    meetingsPerSeason: 1 | 2,    // 1=single round, 2=home+away
    continuousSeasons: boolean   // auto-create season baru setelah selesai
  }
}
```

### Team
```js
{
  id: string,
  leagueId: string,
  name: string,
  shortName: string,        // 3-letter, mis. "ARS"
  badge: string,            // emoji atau URL logo (dari API)
  owner: string | null,     // nama orang yang memegang klub ini
  externalId: string | null // ID dari API jika di-import
}
```

### Season
```js
{
  id: string,
  leagueId: string,
  number: number,                  // 1, 2, 3...
  status: 'setup' | 'active' | 'finished',
  champion: string | null,         // teamId
  createdAt: string,
  startedAt: string | null,
  finishedAt: string | null
}
```

### Match
```js
{
  id: string,
  seasonId: string,
  matchday: number,               // 99 = postponed/delayed
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number | null,       // null = belum dimainkan
  awayScore: number | null,
  status: 'scheduled' | 'delayed' | 'finished',
  originalMatchday: number | null, // jika match dipindah dari matchday lain
  scheduledDate: string | null
}
```

### ClubsCache
```js
{
  [competitionId: string]: {
    data: Club[],       // { id, name, shortName, logo, country }
    fetchedAt: string   // ISO timestamp
  }
}
```

---

## Storage Helper Pattern

`js/storage.js` menyediakan fungsi CRUD sederhana:

```js
function getAll(key)              // → array
function getById(key, id)         // → item | null
function save(key, item)          // create (auto-id) atau update (by id)
function remove(key, id)          // hapus by id
function getSettings()            // → Settings object
function saveSettings(settings)   // update settings
```

Semua data di-serialize/deserialize sebagai JSON. ID dibuat dengan `crypto.randomUUID()`.
