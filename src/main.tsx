import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/main.css';
import App from './App';
import { createId, getAll, KEYS, setAll } from './lib/storage';
import type { Player, Season, Team } from './lib/types';

function migrateOwnerToPlayer(): void {
  const teams = getAll<Team>(KEYS.teams);
  const unmigrated = teams.filter((team) => team.ownerId === undefined);
  if (!unmigrated.length) return;

  const existing = getAll<Player>(KEYS.players);
  const playerMap = new Map<string, Player>(existing.map((player) => [player.name.trim().toLowerCase(), player]));
  const now = new Date().toISOString();

  const updatedTeams = teams.map((team) => {
    if (team.ownerId !== undefined || !team.owner) {
      return team.ownerId !== undefined ? team : { ...team, ownerId: null };
    }

    const ownerName = team.owner.trim();
    if (!ownerName) return { ...team, ownerId: null };

    const key = ownerName.toLowerCase();
    if (!playerMap.has(key)) {
      const player: Player = {
        id: createId(),
        name: ownerName,
        createdAt: team.createdAt ?? now,
      };
      playerMap.set(key, player);
    }

    return { ...team, ownerId: playerMap.get(key)!.id };
  });

  setAll<Player>(KEYS.players, [
    ...existing,
    ...Array.from(playerMap.values()).filter((player) => !existing.some((item) => item.id === player.id)),
  ]);
  setAll<Team>(KEYS.teams, updatedTeams);
}

function migrateSeasonOwnerSnapshots(): void {
  const seasons = getAll<Season>(KEYS.seasons);
  const missingSnapshots = seasons.filter((season) => season.ownerSnapshots === undefined);
  if (!missingSnapshots.length) return;

  const teams = getAll<Team>(KEYS.teams);
  const players = getAll<Player>(KEYS.players);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const playerMap = new Map(players.map((player) => [player.id, player]));

  setAll(
    KEYS.seasons,
    seasons.map((season) => {
      if (season.ownerSnapshots !== undefined) return season;
      return {
        ...season,
        ownerSnapshots: Object.fromEntries((season.teamIds || []).map((teamId) => {
          const team = teamMap.get(teamId);
          const player = team?.ownerId ? playerMap.get(team.ownerId) : null;
          return [teamId, { playerId: team?.ownerId || null, playerName: player?.name || team?.owner || null }];
        })),
      };
    }),
  );
}

migrateOwnerToPlayer();
migrateSeasonOwnerSnapshots();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
