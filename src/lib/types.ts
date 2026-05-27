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

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName?: string;
  badge?: string;
  logo?: string;
  owner?: string | null;
  status: 'pool' | 'active';
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
  champion?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  bracket?: PlayoffBracket;
}

export interface AppSettings {
  apiKey: string;
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
