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
  skillOverride?: 'jago' | 'sedang' | 'pemula' | null;
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
  status: 'pool' | 'active';
  tier?: 'elite' | 'mid' | 'underdog' | null;
  externalId?: string | null;
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
