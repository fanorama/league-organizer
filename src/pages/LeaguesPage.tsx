import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Badge } from '../components/Badge';
import { Shell } from '../components/Shell';
import { byCreatedAtDesc } from '../lib/storage';
import { useLeagueStore } from '../store/useLeagueStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';

export function LeaguesPage() {
  const navigate = useNavigate();
  const allLeagues = useLeagueStore((s) => s.leagues);
  const teams = useTeamStore((s) => s.teams);
  const seasons = useSeasonStore((s) => s.seasons);
  const createLeague = useLeagueStore((s) => s.createLeague);
  const deleteLeague = useLeagueStore((s) => s.deleteLeague);
  const fetchLeagues = useLeagueStore((s) => s.fetchLeagues);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const leagues = useMemo(() => [...allLeagues].sort(byCreatedAtDesc), [allLeagues]);

  useEffect(() => {
    fetchLeagues();
    fetchTeams();
    fetchSeasons();
  }, [fetchLeagues, fetchTeams, fetchSeasons]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const league = await createLeague({
      name,
      description: String(data.get('description')).trim(),
      createdAt: new Date().toISOString(),
      settings: {
        meetingsPerSeason: Number(data.get('meetingsPerSeason')),
        continuousSeasons: data.get('continuousSeasons') === 'true',
      },
    });
    navigate(`/league/${league.id}`);
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this league and all related teams, seasons, and matches?')) {
      await deleteLeague(id);
      await Promise.all([fetchTeams(), fetchSeasons()]);
    }
  }

  return (
    <Shell active="leagues" title="Leagues">
      {isAdmin ? (
        <section className="card">
          <h2>Create league</h2>
          <form id="createLeague" className="form-grid" onSubmit={handleCreate}>
            <div className="field">
              <label>Name</label>
              <input name="name" required placeholder="Weekend League" />
            </div>
            <div className="field">
              <label>Meetings</label>
              <select name="meetingsPerSeason" defaultValue="2">
                <option value="1">Single round</option>
                <option value="2">Home and away</option>
              </select>
            </div>
            <div className="field">
              <label>Continuous seasons</label>
              <select name="continuousSeasons" defaultValue="false">
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <input name="description" placeholder="Optional" />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="btn primary" type="submit">
                Create
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section style={{ marginTop: 18 }}>
        {leagues.length ? (
          <div className="grid">
            {leagues.map((league) => {
              const leagueTeams = teams.filter((team) => team.leagueId === league.id);
              const activeSeason = seasons.find((season) => season.leagueId === league.id && season.status === 'active');
              const latestSeason = seasons.filter((season) => season.leagueId === league.id).sort((a, b) => b.number - a.number)[0];
              return (
                <article className="card" key={league.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h2>{league.name}</h2>
                    <Badge status={activeSeason ? 'active' : latestSeason ? latestSeason.status : 'no season'} />
                  </div>
                  <p className="muted">{league.description || 'No description'}</p>
                  <div className="row">
                    <span className="badge">{leagueTeams.length} teams</span>
                    <span className="badge">
                      {league.settings.meetingsPerSeason} meeting{league.settings.meetingsPerSeason === 1 ? '' : 's'}
                    </span>
                    {league.settings.continuousSeasons ? <span className="badge success">continuous</span> : null}
                  </div>
                  <div className="actions">
                    <button className="btn primary" type="button" onClick={() => navigate(`/league/${league.id}`)}>
                      Open
                    </button>
                    {isAdmin ? (
                      <button className="btn danger" type="button" onClick={() => handleDelete(league.id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">No leagues yet. Create one to begin.</div>
        )}
      </section>
    </Shell>
  );
}
