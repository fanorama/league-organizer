export interface PlayoffFormat {
  upperEarly: number;
  upperFinal: number;
  lowerEarly: number;
  lowerFinal: number;
  grandFinal: number;
}

export interface LeagueSettings {
  meetingsPerSeason: number;
  continuousSeasons: boolean;
  playoff?: {
    enabled: boolean;
    teamsCount: number;
    formatPerRound: PlayoffFormat;
  };
}

export interface League {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  settings: LeagueSettings;
}

export interface Player {
  id: string;
  name: string;
  createdAt: string;
  skillOverride?: 'super' | 'jago' | 'sedang' | 'pemula' | null;
}

export interface ClubTier {
  externalId: string;
  tier: 'elite' | 'mid' | 'underdog';
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName?: string;
  badge?: string;
  logo?: string;
  owner?: string | null; // DEPRECATED — retained for migration fallback
  ownerId?: string | null; // points to Player.id global
  status: 'pool' | 'ready' | 'active';
  tier?: 'elite' | 'mid' | 'underdog' | null;
  externalId?: string | null;
  sortOrder?: number | null;
  createdAt?: string;
}

export interface BracketSlotRef {
  bracket: string;
  round: number;
  slot?: number;
  slotIndex?: number;
  leg?: number;
  legIndex?: number;
  isExtraLeg?: boolean;
}

export interface Match {
  id: string;
  seasonId: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'scheduled' | 'finished' | 'delayed';
  matchType?: 'league' | 'playoff';
  originalMatchday?: number | null;
  scheduledDate?: string | null;
  bracketSlot?: BracketSlotRef;
}

export interface PlayoffSlot {
  team1?: string | null;
  team2?: string | null;
  matchIds: string[];
  winner?: string | null;
  bye?: boolean;
  forwarded?: boolean;
}

export interface PlayoffBracket {
  seeds?: string[];
  config: {
    teamsCount: number;
    format: PlayoffFormat;
  };
  upper: { rounds: PlayoffSlot[][] };
  lower: { rounds: PlayoffSlot[][] };
  grandFinal: {
    match?: PlayoffSlot | null;
    reset?: PlayoffSlot | null;
  };
}

export interface Season {
  id: string;
  leagueId: string;
  number: number;
  status: 'setup' | 'active' | 'finished' | 'playoff_setup' | 'playoff_active';
  teamIds?: string[];
  ownerSnapshots?: Record<string, { playerId: string | null; playerName: string | null }>;
  champion?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  bracket?: PlayoffBracket;
}

export interface CacheEntry<T = ClubFromApi[]> {
  data: T;
  fetchedAt: string;
}

export interface ClubFromApi {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  badge?: string;
  country?: string;
}

export interface QuickMatchSession {
  id: string;
  player1Id: string;
  player2Id: string;
  status: 'active' | 'finished';
  createdAt: string;
  finishedAt?: string | null;
}

export interface QuickMatchClubSnapshot {
  id: string;
  name: string;
  logo?: string;
}

export interface QuickMatchGame {
  id: string;
  sessionId: string;
  player1Club: QuickMatchClubSnapshot;
  player2Club: QuickMatchClubSnapshot;
  player1Score: number;
  player2Score: number;
  createdAt: string;
}

// ===== Competition (turnamen Group + Knockout, entitas top-level mandiri) =====

export type CompetitionStatus =
  | 'setup' | 'draw_clubs' | 'group_draw' | 'group_stage' | 'knockout' | 'finished';
export type QualifyMode = 'top1' | 'top2' | 'top2_plus_best_thirds';

/** Snapshot klub terpilih untuk pool undian (sumber: API football-data per liga). */
export interface CompetitionClub {
  externalId: string;
  name: string;
  logo?: string | null;
}

export interface CompetitionSettings {
  groupCount: number;
  participantsTarget?: number;
  meetingsPerPair: 1 | 2;
  qualifyMode: QualifyMode;
  bestThirdsCount?: number;       // dipakai bila qualifyMode === 'top2_plus_best_thirds'
  knockoutLegs: 1 | 2;            // final selalu 1 leg apapun nilainya
  potCount: number;
  clubPool?: CompetitionClub[];   // klub terpilih untuk wheel; kosong/undefined = pakai tim global
}

export interface GroupDef { key: string; participantIds: string[]; }

// Reuse pola PlayoffSlot: satu "tie" knockout
export interface CompetitionTie {
  team1?: string | null;          // participantId
  team2?: string | null;          // participantId
  matchIds: string[];             // 1 (single) atau 2 (two-legged) leg
  winner?: string | null;         // participantId; manual bila agregat seri
  bye?: boolean;
}

export interface CompetitionBracket {
  rounds: CompetitionTie[][];     // rounds[0] = babak pertama knockout
  seeds?: string[];               // urutan participantId hasil seeding grup
  warning?: string;               // diisi bila bracket dari fallback (lookup tak didukung)
}

export interface Competition {
  id: string;
  name: string;
  description?: string;
  status: CompetitionStatus;
  settings: CompetitionSettings;
  groups?: GroupDef[];
  bracket?: CompetitionBracket;
  championId?: string | null;     // participantId pemenang
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface CompetitionParticipant {
  id: string;
  competitionId: string;
  playerId: string;
  clubExternalId?: string | null;
  clubName?: string | null;
  clubLogo?: string | null;
  clubTier?: 'elite' | 'mid' | 'underdog' | null;
  pot?: number | null;
  groupKey?: string | null;
  seed?: number | null;
  createdAt?: string;
}

export interface CompetitionMatch {
  id: string;
  competitionId: string;
  stage: 'group' | 'knockout';
  groupKey?: string | null;       // diisi bila stage='group'
  round?: number | null;          // diisi bila stage='knockout'
  tieIndex?: number | null;       // diisi bila stage='knockout'
  leg?: number | null;            // 1|2 bila two-legged
  homeParticipantId?: string | null;
  awayParticipantId?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'scheduled' | 'finished';
  createdAt?: string;
}
