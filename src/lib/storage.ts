import { supabase } from './supabase';
import type { CacheEntry, ClubTier, League, Match, Player, QuickMatchGame, QuickMatchSession, Season, Team } from './types';

type DbRow = Record<string, any>;

function stripUndefined(row: DbRow): DbRow {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined && value !== ''));
}

function dbToLeague(row: DbRow): League {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    settings: row.settings,
    createdAt: row.created_at,
  };
}

function leagueToDb(league: Partial<League>): DbRow {
  return stripUndefined({
    id: league.id,
    name: league.name,
    description: league.description ?? null,
    settings: league.settings,
    created_at: league.createdAt,
  });
}

function dbToPlayer(row: DbRow): Player {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    skillOverride: row.skill_override ?? null,
  };
}

function playerToDb(player: Partial<Player>): DbRow {
  return stripUndefined({
    id: player.id,
    name: player.name,
    created_at: player.createdAt,
    skill_override: player.skillOverride ?? null,
  });
}

function dbToTeam(row: DbRow): Team {
  return {
    id: row.id,
    leagueId: row.league_id,
    name: row.name,
    shortName: row.short_name ?? undefined,
    badge: row.badge ?? undefined,
    logo: row.logo ?? undefined,
    status: row.status,
    ownerId: row.owner_id ?? null,
    tier: row.tier ?? null,
    externalId: row.external_id ?? null,
    createdAt: row.created_at,
  };
}

function teamToDb(team: Partial<Team>): DbRow {
  return stripUndefined({
    id: team.id,
    league_id: team.leagueId,
    name: team.name,
    short_name: team.shortName,
    badge: team.badge,
    logo: team.logo,
    status: team.status,
    owner_id: team.ownerId ?? null,
    tier: team.tier ?? null,
    external_id: team.externalId ?? null,
    created_at: team.createdAt,
  });
}

function dbToClubTier(row: DbRow): ClubTier {
  return {
    externalId: row.external_id,
    tier: row.tier,
  };
}

function clubTierToDb(entry: ClubTier): DbRow {
  return {
    external_id: entry.externalId,
    tier: entry.tier,
  };
}

function dbToSeason(row: DbRow): Season {
  return {
    id: row.id,
    leagueId: row.league_id,
    number: row.number,
    status: row.status,
    teamIds: row.team_ids ?? [],
    ownerSnapshots: row.owner_snapshots ?? {},
    champion: row.champion_id ?? null,
    bracket: row.bracket ?? undefined,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    createdAt: row.created_at,
  };
}

function seasonToDb(season: Partial<Season>): DbRow {
  return stripUndefined({
    id: season.id,
    league_id: season.leagueId,
    number: season.number,
    status: season.status,
    team_ids: season.teamIds,
    owner_snapshots: season.ownerSnapshots,
    champion_id: season.champion ?? null,
    bracket: season.bracket ?? null,
    started_at: season.startedAt ?? null,
    finished_at: season.finishedAt ?? null,
    created_at: season.createdAt,
  });
}

function dbToMatch(row: DbRow): Match {
  return {
    id: row.id,
    seasonId: row.season_id,
    matchday: row.matchday,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    matchType: row.match_type,
    originalMatchday: row.original_matchday,
    scheduledDate: row.scheduled_date,
    bracketSlot: row.bracket_slot ?? undefined,
  };
}

function matchToDb(match: Partial<Match>): DbRow {
  return stripUndefined({
    id: match.id,
    season_id: match.seasonId,
    matchday: match.matchday,
    home_team_id: match.homeTeamId,
    away_team_id: match.awayTeamId,
    home_score: match.homeScore ?? null,
    away_score: match.awayScore ?? null,
    status: match.status,
    match_type: match.matchType ?? 'league',
    original_matchday: match.originalMatchday ?? null,
    scheduled_date: match.scheduledDate ?? null,
    bracket_slot: match.bracketSlot ?? null,
  });
}

function dbToQuickMatchSession(row: DbRow): QuickMatchSession {
  return {
    id: row.id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? null,
  };
}

function quickMatchSessionToDb(session: Partial<QuickMatchSession>): DbRow {
  return stripUndefined({
    id: session.id,
    player1_id: session.player1Id,
    player2_id: session.player2Id,
    status: session.status,
    created_at: session.createdAt,
    finished_at: session.finishedAt ?? null,
  });
}

function dbToQuickMatchGame(row: DbRow): QuickMatchGame {
  return {
    id: row.id,
    sessionId: row.session_id,
    player1Club: {
      id: row.player1_club_id,
      name: row.player1_club_name,
      logo: row.player1_club_logo ?? undefined,
    },
    player2Club: {
      id: row.player2_club_id,
      name: row.player2_club_name,
      logo: row.player2_club_logo ?? undefined,
    },
    player1Score: row.player1_score,
    player2Score: row.player2_score,
    createdAt: row.created_at,
  };
}

function quickMatchGameToDb(game: Partial<QuickMatchGame>): DbRow {
  return stripUndefined({
    id: game.id,
    session_id: game.sessionId,
    player1_club_id: game.player1Club?.id,
    player1_club_name: game.player1Club?.name,
    player2_club_id: game.player2Club?.id,
    player2_club_name: game.player2Club?.name,
    player1_score: game.player1Score,
    player2_score: game.player2Score,
    created_at: game.createdAt,
  });
}

export async function getLeagues(): Promise<League[]> {
  const { data, error } = await supabase.from('leagues').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToLeague);
}

export async function getLeagueById(id: string): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? dbToLeague(data) : null;
}

export async function saveLeague(league: Omit<League, 'id'> | League): Promise<League> {
  const { data, error } = await supabase.from('leagues').upsert(leagueToDb(league)).select().single();
  if (error) throw error;
  return dbToLeague(data);
}

export async function deleteLeague(id: string): Promise<void> {
  const { error } = await supabase.from('leagues').delete().eq('id', id);
  if (error) throw error;
}

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToPlayer);
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? dbToPlayer(data) : null;
}

export async function savePlayer(player: Omit<Player, 'id'> | Player): Promise<Player> {
  const { data, error } = await supabase.from('players').upsert(playerToDb(player)).select().single();
  if (error) throw error;
  return dbToPlayer(data);
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToTeam);
}

export async function getTeamsByLeague(leagueId: string): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').eq('league_id', leagueId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToTeam);
}

export async function getTeamById(id: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? dbToTeam(data) : null;
}

export async function saveTeam(team: Omit<Team, 'id'> | Team): Promise<Team> {
  const { data, error } = await supabase.from('teams').upsert(teamToDb(team)).select().single();
  if (error) throw error;
  return dbToTeam(data);
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function getClubTier(externalId: string): Promise<ClubTier | null> {
  const { data, error } = await supabase.from('club_tiers').select('*').eq('external_id', externalId).maybeSingle();
  if (error) throw error;
  return data ? dbToClubTier(data) : null;
}

export async function saveClubTier(entry: ClubTier): Promise<ClubTier> {
  const { data, error } = await supabase.from('club_tiers').upsert(clubTierToDb(entry)).select().single();
  if (error) throw error;
  return dbToClubTier(data);
}

export async function deleteClubTier(externalId: string): Promise<void> {
  const { error } = await supabase.from('club_tiers').delete().eq('external_id', externalId);
  if (error) throw error;
}

export async function getClubTiers(externalIds: string[]): Promise<ClubTier[]> {
  if (!externalIds.length) return [];
  const { data, error } = await supabase.from('club_tiers').select('*').in('external_id', externalIds);
  if (error) throw error;
  return (data ?? []).map(dbToClubTier);
}

export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabase.from('seasons').select('*').order('number', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToSeason);
}

export async function getSeasonsByLeague(leagueId: string): Promise<Season[]> {
  const { data, error } = await supabase.from('seasons').select('*').eq('league_id', leagueId).order('number', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToSeason);
}

export async function getSeasonById(id: string): Promise<Season | null> {
  const { data, error } = await supabase.from('seasons').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? dbToSeason(data) : null;
}

export async function saveSeason(season: Omit<Season, 'id'> | Season): Promise<Season> {
  const { data, error } = await supabase.from('seasons').upsert(seasonToDb(season)).select().single();
  if (error) throw error;
  return dbToSeason(data);
}

export async function deleteSeason(id: string): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*').order('matchday', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToMatch);
}

export async function getMatchesBySeason(seasonId: string): Promise<Match[]> {
  const { data, error } = await supabase.from('matches').select('*').eq('season_id', seasonId).order('matchday', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToMatch);
}

export async function getMatchById(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? dbToMatch(data) : null;
}

export async function saveMatch(match: Omit<Match, 'id'> | Match): Promise<Match> {
  const { data, error } = await supabase.from('matches').upsert(matchToDb(match)).select().single();
  if (error) throw error;
  return dbToMatch(data);
}

export async function saveMatches(matches: (Omit<Match, 'id'> | Match)[]): Promise<Match[]> {
  if (!matches.length) return [];
  const { data, error } = await supabase.from('matches').upsert(matches.map(matchToDb)).select();
  if (error) throw error;
  return (data ?? []).map(dbToMatch);
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteMatchesBySeason(seasonId: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('season_id', seasonId);
  if (error) throw error;
}

export async function getQuickMatchSessions(): Promise<QuickMatchSession[]> {
  const { data, error } = await supabase.from('quick_match_sessions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToQuickMatchSession);
}

export async function saveQuickMatchSession(session: Omit<QuickMatchSession, 'id'> | QuickMatchSession): Promise<QuickMatchSession> {
  const { data, error } = await supabase.from('quick_match_sessions').upsert(quickMatchSessionToDb(session)).select().single();
  if (error) throw error;
  return dbToQuickMatchSession(data);
}

export async function getQuickMatchGamesBySession(sessionId: string): Promise<QuickMatchGame[]> {
  const { data, error } = await supabase.from('quick_match_games').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToQuickMatchGame);
}

export async function saveQuickMatchGame(game: Omit<QuickMatchGame, 'id'> | QuickMatchGame): Promise<QuickMatchGame> {
  const { data, error } = await supabase.from('quick_match_games').upsert(quickMatchGameToDb(game)).select().single();
  if (error) throw error;
  return dbToQuickMatchGame(data);
}

export function getCache<T = CacheEntry>(): Record<string, T> {
  return JSON.parse(localStorage.getItem('clubs_cache') || '{}') as Record<string, T>;
}

export function saveCache<T>(cache: Record<string, T>): Record<string, T> {
  localStorage.setItem('clubs_cache', JSON.stringify(cache));
  return cache;
}

export function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
