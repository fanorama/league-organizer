import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Badge } from '../components/Badge';
import { Shell } from '../components/Shell';
import { TeamBadge } from '../components/TeamBadge';
import type { PlayoffFormat } from '../lib/types';
import { useLeagueStore } from '../store/useLeagueStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';

const DEFAULT_FORMAT: PlayoffFormat = {
  upperEarly: 1,
  upperFinal: 1,
  lowerEarly: 1,
  lowerFinal: 1,
  grandFinal: 1,
};

export function LeaguePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const league = useLeagueStore((s) => s.leagues.find((item) => item.id === id));
  const updateLeague = useLeagueStore((s) => s.updateLeague);
  const createSeason = useSeasonStore((s) => s.createSeason);
  const allSeasons = useSeasonStore((s) => s.seasons);
  const allTeams = useTeamStore((s) => s.teams);
  const seasons = useMemo(() => allSeasons.filter((season) => season.leagueId === id).sort((a, b) => b.number - a.number), [allSeasons, id]);
  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === id && team.status === 'active' && team.owner), [allTeams, id]);

  if (!league) {
    return (
      <Shell active="leagues" title="League">
        <div className="empty">League not found.</div>
      </Shell>
    );
  }

  const champions = Object.fromEntries(teams.map((team) => [team.id, team]));
  const playoffSettings = league.settings.playoff ?? {
    enabled: false,
    teamsCount: 4,
    formatPerRound: DEFAULT_FORMAT,
  };

  function handleCreateSeason() {
    if (!league) return;
    const season = createSeason(league, teams);
    navigate(`/league/${league.id}/season/${season.id}`);
  }

  function handleSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!league) return;
    const data = new FormData(event.currentTarget);
    updateLeague({
      ...league,
      settings: {
        meetingsPerSeason: Number(data.get('meetingsPerSeason')),
        continuousSeasons: data.get('continuousSeasons') === 'true',
        playoff: {
          enabled: data.get('playoffEnabled') === 'true',
          teamsCount: Number(data.get('playoffTeamsCount')) || 4,
          formatPerRound: {
            upperEarly: Number(data.get('fmtUpperEarly')) || 1,
            upperFinal: Number(data.get('fmtUpperFinal')) || 1,
            lowerEarly: Number(data.get('fmtLowerEarly')) || 1,
            lowerFinal: Number(data.get('fmtLowerFinal')) || 1,
            grandFinal: Number(data.get('fmtGrandFinal')) || 1,
          },
        },
      },
    });
  }

  return (
    <Shell active="leagues" title={league.name} actions={<Link className="btn" to={`/league/${league.id}/teams`}>Teams</Link>}>
      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Seasons</h2>
            <button id="createSeason" className="btn primary" type="button" disabled={teams.length < 2} onClick={handleCreateSeason}>
              Create season
            </button>
          </div>
          <div className="panel-body">
            {teams.length < 2 ? <div className="empty">Add at least two teams before creating a season.</div> : null}
            {seasons.length ? (
              <div className="list">
                {seasons.map((season) => (
                  <div className="list-row" key={season.id}>
                    <div>
                      <strong>Season {season.number}</strong>
                      <div className="muted">{season.champion ? `Champion: ${champions[season.champion]?.name || 'Unknown'}` : 'No champion yet'}</div>
                    </div>
                    <div className="actions">
                      <Badge status={season.status} />
                      <Link className="btn" to={`/league/${league.id}/season/${season.id}`}>
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : teams.length >= 2 ? (
              <div className="empty">No seasons yet.</div>
            ) : null}
          </div>
        </section>
        <aside className="list">
          <section className="card">
            <h2>League settings</h2>
            <form id="settingsForm" className="list" onSubmit={handleSettings}>
              <div className="field">
                <label>Meetings per season</label>
                <select name="meetingsPerSeason" defaultValue={league.settings.meetingsPerSeason}>
                  <option value="1">Single round</option>
                  <option value="2">Home and away</option>
                </select>
              </div>
              <div className="field">
                <label>Continuous seasons</label>
                <select name="continuousSeasons" defaultValue={String(league.settings.continuousSeasons)}>
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </div>
              <div className="field">
                <label>Playoff</label>
                <select name="playoffEnabled" defaultValue={String(playoffSettings.enabled)}>
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </div>
              <div id="playoffConfig">
                <div className="field">
                  <label>Teams in playoff</label>
                  <select name="playoffTeamsCount" defaultValue={playoffSettings.teamsCount}>
                    <option value="4">Top 4</option>
                    <option value="6">Top 6</option>
                    <option value="8">Top 8</option>
                  </select>
                </div>
                <div className="field">
                  <label>UB early rounds (legs)</label>
                  <input name="fmtUpperEarly" type="number" min="1" max="3" defaultValue={playoffSettings.formatPerRound.upperEarly} />
                </div>
                <div className="field">
                  <label>UB Final (legs)</label>
                  <input name="fmtUpperFinal" type="number" min="1" max="3" defaultValue={playoffSettings.formatPerRound.upperFinal} />
                </div>
                <div className="field">
                  <label>LB early rounds (legs)</label>
                  <input name="fmtLowerEarly" type="number" min="1" max="3" defaultValue={playoffSettings.formatPerRound.lowerEarly} />
                </div>
                <div className="field">
                  <label>LB Final (legs)</label>
                  <input name="fmtLowerFinal" type="number" min="1" max="3" defaultValue={playoffSettings.formatPerRound.lowerFinal} />
                </div>
                <div className="field">
                  <label>Grand Final (legs)</label>
                  <input name="fmtGrandFinal" type="number" min="1" max="3" defaultValue={playoffSettings.formatPerRound.grandFinal} />
                </div>
              </div>
              <button className="btn" type="submit">
                Save
              </button>
            </form>
          </section>
          <section className="card">
            <h2>Teams</h2>
            {teams.length ? (
              <div className="list">
                {teams.slice(0, 8).map((team) => (
                  <div className="team-line" key={team.id}>
                    <TeamBadge team={team} />
                    <span className="team-name">{team.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No teams.</div>
            )}
          </section>
        </aside>
      </div>
    </Shell>
  );
}
