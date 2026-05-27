import type { Player, Team } from './types';

export function getAssignedPlayerIdsInLeague(teams: Team[], leagueId: string): Set<string> {
  return new Set(
    teams
      .filter((team) => team.leagueId === leagueId && team.ownerId)
      .map((team) => team.ownerId!),
  );
}

export function getAssignablePlayersForLeague(players: Player[], teams: Team[], leagueId: string): Player[] {
  const assignedPlayerIds = getAssignedPlayerIdsInLeague(teams, leagueId);
  return players.filter((player) => !assignedPlayerIds.has(player.id));
}

export function canAssignPlayerToLeague(playerId: string, teams: Team[], leagueId: string): boolean {
  return !getAssignedPlayerIdsInLeague(teams, leagueId).has(playerId);
}
