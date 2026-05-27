import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Shell } from '../components/Shell';
import { TeamBadge } from '../components/TeamBadge';
import { advancePlayoffRound, createSeasonWithSchedule, replaceSeasonSchedule, resolveMultiLegWinnerPublic, startPlayoff } from '../lib/schedule';
import { calculateStandings } from '../lib/standings';
import { KEYS, getAll, save } from '../lib/storage';
import type { League, Match, PlayoffSlot, Season, Team } from '../lib/types';
import { useLeagueStore } from '../store/useLeagueStore';
import { useMatchStore } from '../store/useMatchStore';
import { useSeasonStore } from '../store/useSeasonStore';
import { useTeamStore } from '../store/useTeamStore';

type TabName = 'schedule' | 'standings' | 'playoff';

export function SeasonPage() {
  const { id: leagueId, seasonId } = useParams<{ id: string; seasonId: string }>();
  const [activeTab, setActiveTab] = useState<TabName>('schedule');
  const league = useLeagueStore((s) => s.leagues.find((item) => item.id === leagueId));
  const season = useSeasonStore((s) => s.seasons.find((item) => item.id === seasonId));
  const updateSeason = useSeasonStore((s) => s.updateSeason);
  const refreshSeasons = useSeasonStore((s) => s.refresh);
  const allMatches = useMatchStore((s) => s.matches);
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const refreshMatches = useMatchStore((s) => s.refresh);
  const allTeams = useTeamStore((s) => s.teams);

  const matches = useMemo(() => allMatches.filter((match) => match.seasonId === seasonId), [allMatches, seasonId]);
  const teams = useMemo(() => allTeams.filter((team) => team.leagueId === leagueId), [allTeams, leagueId]);
  const activeTeams = useMemo(() => teams.filter((team) => team.status === 'active' && team.ownerId), [teams]);
  const teamById = useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const leagueMatches = matches.filter((match) => (match.matchType || 'league') === 'league');
  const allFinished = leagueMatches.length > 0 && leagueMatches.every((match) => match.status === 'finished');

  useEffect(() => {
    if (!season || !league || season.status !== 'active' || !allFinished) return;
    const standings = calculateStandings(season.id);
    if (league.settings.playoff?.enabled) {
      updateSeason({ ...season, status: 'playoff_setup' });
      setActiveTab('playoff');
      return;
    }
    updateSeason({
      ...season,
      status: 'finished',
      champion: standings[0]?.team.id || null,
      finishedAt: new Date().toISOString(),
    });
    if (league.settings.continuousSeasons) {
      createSeasonWithSchedule(league, activeTeams);
      refreshSeasons();
      refreshMatches();
    }
  }, [allFinished, league, season, updateSeason, activeTeams, refreshSeasons, refreshMatches]);

  if (!season || !league) {
    return (
      <Shell active="leagues" title="Season">
        <div className="empty">Season not found.</div>
      </Shell>
    );
  }

  const currentSeason = season;
  const currentLeague = league;
  const showPlayoffTab = ['playoff_setup', 'playoff_active'].includes(currentSeason.status) || (currentSeason.status === 'finished' && !!currentSeason.bracket);
  const safeActiveTab = showPlayoffTab || activeTab !== 'playoff' ? activeTab : 'schedule';

  function handleRandomize() {
    replaceSeasonSchedule(currentSeason, activeTeams.map((team) => team.id), currentLeague.settings.meetingsPerSeason);
    refreshMatches();
  }

  function handleStartSeason() {
    if (confirm('Start season? Schedule changes will be locked.')) {
      updateSeason({ ...currentSeason, status: 'active', startedAt: new Date().toISOString() });
    }
  }

  return (
    <Shell active="leagues" title={`${currentLeague.name} - Season ${currentSeason.number}`} actions={<Link className="btn" to={`/league/${currentLeague.id}`}>Back</Link>}>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>Season {currentSeason.number}</h2>
            <div className="muted">
              {matches.length} matches · {matches.filter((match) => match.status === 'finished').length} finished
            </div>
          </div>
          <div className="actions">
            <Badge status={currentSeason.status} />
            {currentSeason.status === 'setup' ? (
              <>
                <button id="randomize" className="btn" type="button" onClick={handleRandomize}>
                  Randomize
                </button>
                <button id="startSeason" className="btn primary" type="button" disabled={activeTeams.length < 2} onClick={handleStartSeason}>
                  Start season
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <div className="tabs">
        <button className={`tab ${safeActiveTab === 'schedule' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('schedule')}>
          Schedule
        </button>
        <button className={`tab ${safeActiveTab === 'standings' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('standings')}>
          Standings
        </button>
        {showPlayoffTab ? (
          <button className={`tab ${safeActiveTab === 'playoff' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('playoff')}>
            Playoff
          </button>
        ) : null}
      </div>
      <section id="tabContent">
        {safeActiveTab === 'standings' ? <StandingsTab season={currentSeason} /> : null}
        {safeActiveTab === 'playoff' ? <PlayoffTab season={currentSeason} league={currentLeague} teams={teamById} refresh={() => { refreshSeasons(); refreshMatches(); }} /> : null}
        {safeActiveTab === 'schedule' ? <ScheduleTab season={currentSeason} teams={teamById} matches={leagueMatches} updateMatch={updateMatch} refreshMatches={refreshMatches} /> : null}
      </section>
    </Shell>
  );
}

function ScheduleTab({
  season,
  teams,
  matches,
  updateMatch,
  refreshMatches,
}: {
  season: Season;
  teams: Record<string, Team>;
  matches: Match[];
  updateMatch: (match: Match) => Match;
  refreshMatches: () => void;
}) {
  const sorted = [...matches].sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));
  const groups = sorted.reduce((acc, match) => {
    if (!acc.has(match.matchday)) acc.set(match.matchday, []);
    acc.get(match.matchday)!.push(match);
    return acc;
  }, new Map<number, Match[]>());

  if (!matches.length) return <div className="empty">No schedule generated.</div>;

  return (
    <>
      {[...groups.entries()].map(([matchday, items]) => (
        <div className="matchday" key={matchday}>
          <div className="matchday-title">{Number(matchday) === 99 ? 'Postponed' : `Matchday ${matchday}`}</div>
          {items.map((match) => (
            <MatchCard key={match.id} match={match} season={season} teams={teams} updateMatch={updateMatch} refreshMatches={refreshMatches} />
          ))}
        </div>
      ))}
    </>
  );
}

function MatchCard({
  match,
  season,
  teams,
  updateMatch,
  refreshMatches,
}: {
  match: Match;
  season: Season;
  teams: Record<string, Team>;
  updateMatch: (match: Match) => Match;
  refreshMatches: () => void;
}) {
  const [homeScore, setHomeScore] = useState(match.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore ?? '');
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const canEdit = season.status === 'active' && match.status !== 'finished';

  function handleSave() {
    updateMatch({ ...match, homeScore: Number(homeScore), awayScore: Number(awayScore), status: 'finished' });
  }

  function handleDelay() {
    updateMatch({ ...match, status: 'delayed', originalMatchday: match.matchday, matchday: 99 });
    refreshMatches();
  }

  return (
    <article className="match-card">
      <div className="match-main">
        <TeamSummary team={home} season={season} />
        <div className="score-box">
          {canEdit ? (
            <>
              <input className="score-input" name="homeScore" type="number" min="0" value={homeScore} onChange={(event) => setHomeScore(event.target.value === '' ? '' : Number(event.target.value))} />
              <span>-</span>
              <input className="score-input" name="awayScore" type="number" min="0" value={awayScore} onChange={(event) => setAwayScore(event.target.value === '' ? '' : Number(event.target.value))} />
            </>
          ) : (
            <>
              <span>{match.homeScore ?? ''}</span>
              <span>{match.status === 'finished' ? '-' : 'vs'}</span>
              <span>{match.awayScore ?? ''}</span>
            </>
          )}
        </div>
        <TeamSummary team={away} season={season} side="away" />
      </div>
      <div className="actions">
        <Badge status={match.status} />
        {canEdit ? (
          <button className="btn primary" type="button" onClick={handleSave}>
            Save
          </button>
        ) : null}
        {canEdit && match.status === 'scheduled' ? (
          <button className="btn" type="button" onClick={handleDelay}>
            Delay
          </button>
        ) : null}
      </div>
    </article>
  );
}

function getSeasonOwnerName(season: Season, teamId: string | null | undefined): string {
  if (!teamId) return 'unassigned';
  return season.ownerSnapshots?.[teamId]?.playerName || 'unassigned';
}

function TeamSummary({ team, season, side = 'home' }: { team?: Team; season: Season; side?: 'home' | 'away' }) {
  const details = (
    <div>
      <div className="team-name">{team?.name || 'Unknown'}</div>
      <div className="muted">owner: {getSeasonOwnerName(season, team?.id)}</div>
    </div>
  );
  return side === 'away' ? (
    <div className="team-line away">
      {details}
      <TeamBadge team={team} />
    </div>
  ) : (
    <div className="team-line">
      <TeamBadge team={team} />
      {details}
    </div>
  );
}

function StandingsTab({ season }: { season: Season }) {
  const rows = calculateStandings(season.id);

  return (
    <section className="panel">
      <div className="panel-body" style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Owner</th>
              <th className="center">P</th>
              <th className="center">W</th>
              <th className="center">D</th>
              <th className="center">L</th>
              <th className="center">GF</th>
              <th className="center">GA</th>
              <th className="center">GD</th>
              <th className="center">Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.team.id}>
                <td>{index + 1}</td>
                <td>
                  <div className="team-line">
                    <TeamBadge team={row.team} />
                    <span className="team-name">{row.team.name}</span>
                  </div>
                </td>
                <td>{getSeasonOwnerName(season, row.team.id)}</td>
                <td className="center">{row.played}</td>
                <td className="center">{row.won}</td>
                <td className="center">{row.drawn}</td>
                <td className="center">{row.lost}</td>
                <td className="center">{row.gf}</td>
                <td className="center">{row.ga}</td>
                <td className="center">{row.gd}</td>
                <td className="center">
                  <strong>{row.pts}</strong>
                </td>
                <td>{row.form.join(' ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlayoffTab({ season, league, teams, refresh }: { season: Season; league: League; teams: Record<string, Team>; refresh: () => void }) {
  if (season.status === 'playoff_setup') {
    return <PlayoffSetup season={season} league={league} teams={teams} refresh={refresh} />;
  }
  if ((season.status === 'playoff_active' || season.status === 'finished') && season.bracket) {
    return <PlayoffBracket season={season} teams={teams} refresh={refresh} />;
  }
  return <div className="empty">Playoff selesai.</div>;
}

function PlayoffSetup({ season, league, teams, refresh }: { season: Season; league: League; teams: Record<string, Team>; refresh: () => void }) {
  const playoffConfig = league.settings.playoff;
  const standings = calculateStandings(season.id);
  const seeds = standings.slice(0, playoffConfig?.teamsCount || 4);

  function handleStartPlayoff() {
    if (!playoffConfig) return;
    if (confirm(`Mulai playoff dengan Top ${playoffConfig.teamsCount} tim? Seeding tidak bisa diubah.`)) {
      startPlayoff(season, league);
      refresh();
    }
  }

  return (
    <section className="card">
      <h2>Playoff Setup</h2>
      <p className="muted">Liga reguler selesai. Top {playoffConfig?.teamsCount || 4} tim siap masuk bracket Double Elimination.</p>
      <ol className="seed-list">
        {seeds.map((row, index) => (
          <li className="seed-row" key={row.team.id}>
            <span className="seed-num">{index + 1}.</span>
            <div className="team-line">
              <TeamBadge team={teams[row.team.id]} />
              <span className="team-name">{row.team.name}</span>
            </div>
            <span className="muted">{row.pts} pts</span>
          </li>
        ))}
      </ol>
      <div className="actions" style={{ marginTop: 16 }}>
        <button id="startPlayoffBtn" className="btn primary" type="button" onClick={handleStartPlayoff}>
          Start Playoff
        </button>
      </div>
    </section>
  );
}

function PlayoffBracket({ season, teams, refresh }: { season: Season; teams: Record<string, Team>; refresh: () => void }) {
  const bracket = season.bracket!;

  function renderBracketSection(label: string, rounds: PlayoffSlot[][], keyPrefix: string) {
    return (
      <div className="bracket-section">
        <div className="bracket-section-header">{label}</div>
        <div className="bracket-rounds-row">
          {rounds.map((round, i) => (
            <div className="bracket-round-col" key={`${keyPrefix}-${i}`}>
              <div className="round-col-header">{keyPrefix} R{i + 1}</div>
              <div className="round-col-slots">
                {round.map((slot, index) => (
                  <PlayoffSlotCard slot={slot} season={season} teams={teams} refresh={refresh} key={`${keyPrefix}-${i}-${index}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bracket-layout">
      {renderBracketSection('Upper Bracket', bracket.upper.rounds, 'UB')}
      {renderBracketSection('Lower Bracket', bracket.lower.rounds, 'LB')}
      {bracket.grandFinal.match ? (
        <div className="bracket-section">
          <div className="bracket-section-header">Grand Final</div>
          <div className="bracket-rounds-row">
            <div className="bracket-round-col">
              <div className="round-col-slots">
                <PlayoffSlotCard slot={bracket.grandFinal.match} season={season} teams={teams} refresh={refresh} isGrandFinal />
                {bracket.grandFinal.reset ? <PlayoffSlotCard slot={bracket.grandFinal.reset} season={season} teams={teams} refresh={refresh} isReset /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlayoffSlotCard({
  slot,
  season,
  teams,
  refresh,
  isGrandFinal = false,
  isReset = false,
}: {
  slot: PlayoffSlot;
  season: Season;
  teams: Record<string, Team>;
  refresh: () => void;
  isGrandFinal?: boolean;
  isReset?: boolean;
}) {
  if (slot.bye) {
    return (
      <div className="bracket-slot bye">
        <div className="bsr">
          <div className="bsr-side"><TeamBadge team={slot.team1 ? teams[slot.team1] : null} /></div>
          <span className="bsr-sep">BYE</span>
          <div className="bsr-side bsr-right"></div>
        </div>
      </div>
    );
  }

  const label = isReset ? 'Grand Final Reset' : isGrandFinal ? 'Grand Final' : '';
  const team1 = slot.team1 ? teams[slot.team1] : undefined;
  const team2 = slot.team2 ? teams[slot.team2] : undefined;
  const tbd1 = !slot.team1;
  const tbd2 = !slot.team2;
  const allMatches = Object.fromEntries(
    getAll<Match>(KEYS.matches)
      .filter((match) => match.seasonId === season.id && match.matchType === 'playoff')
      .map((match) => [match.id, match]),
  );
  const slotMatches = slot.matchIds.map((id) => allMatches[id]).filter(Boolean);
  const canEdit = season.status === 'playoff_active';
  const allSlotFinished = slotMatches.length > 0 && slotMatches.every((match) => match.status === 'finished');
  const winner = allSlotFinished ? resolveMultiLegWinnerPublic(slot, slotMatches) : null;
  const tied = allSlotFinished && !winner;
  const isMultiLeg = slotMatches.length > 1;
  const finishedMatches = slotMatches.filter((match) => match.status === 'finished');
  const hasScores = finishedMatches.length > 0;
  const team1Goals = finishedMatches.reduce((sum, match) => sum + (match.homeTeamId === slot.team1 ? (match.homeScore ?? 0) : (match.awayScore ?? 0)), 0);
  const team2Goals = finishedMatches.reduce((sum, match) => sum + (match.homeTeamId === slot.team2 ? (match.homeScore ?? 0) : (match.awayScore ?? 0)), 0);
  const team1Win = winner === slot.team1;
  const team2Win = winner === slot.team2;
  const slotClass = `bracket-slot${allSlotFinished ? ' finished' : ''}${(tbd1 || tbd2) ? ' tbd' : ''}${isGrandFinal ? ' grand-final' : ''}`;

  return (
    <div className={slotClass}>
      {label ? <div className="slot-label">{label}</div> : null}
      <div className="bsr">
        <div className="bsr-side">
          <TeamBadge team={tbd1 ? null : team1} />
          <span className={`bsr-owner${team1Win ? ' bsr-win' : ''}`}>{tbd1 ? 'TBD' : getSeasonOwnerName(season, slot.team1)}</span>
        </div>
        <span className="bsr-sep">
          {hasScores ? (
            <>
              <span className={`bsr-score${team1Win ? ' bsr-win' : ''}`}>{team1Goals}</span>
              <span className="bsr-agg">agg</span>
              <span className={`bsr-score${team2Win ? ' bsr-win' : ''}`}>{team2Goals}</span>
            </>
          ) : (
            'vs'
          )}
        </span>
        <div className="bsr-side bsr-right">
          <span className={`bsr-owner${team2Win ? ' bsr-win' : ''}`}>{tbd2 ? 'TBD' : getSeasonOwnerName(season, slot.team2)}</span>
          <TeamBadge team={tbd2 ? null : team2} />
        </div>
      </div>
      {finishedMatches.length || slotMatches.some((match) => canEdit && match.status !== 'finished') ? (
        <div className="bmt-legs">
          {isMultiLeg ? finishedMatches.map((match) => <FinishedLeg match={match} slotMatches={slotMatches} teams={teams} key={match.id} />) : null}
          {slotMatches.map((match, legIndex) => (canEdit && match.status !== 'finished' ? <EditableLeg match={match} legIndex={legIndex} isMultiLeg={isMultiLeg} teams={teams} season={season} refresh={refresh} key={match.id} /> : null))}
        </div>
      ) : null}
      {tied ? <div className="bmt-note muted">Masih imbang. Extra leg akan ditambahkan.</div> : null}
    </div>
  );
}

function FinishedLeg({ match, slotMatches, teams }: { match: Match; slotMatches: Match[]; teams: Record<string, Team> }) {
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const legIndex = slotMatches.indexOf(match);
  const legLabel = match.bracketSlot?.isExtraLeg ? 'Extra' : `Leg ${legIndex + 1}`;

  return (
    <div className="playoff-leg">
      <span className="leg-label">{legLabel}</span>
      <div className="leg-history-row">
        <TeamBadge team={home} />
        <span className="leg-score">{match.homeScore ?? 0} - {match.awayScore ?? 0}</span>
        <TeamBadge team={away} />
      </div>
    </div>
  );
}

function EditableLeg({ match, legIndex, isMultiLeg, teams, season, refresh }: { match: Match; legIndex: number; isMultiLeg: boolean; teams: Record<string, Team>; season: Season; refresh: () => void }) {
  const [homeScore, setHomeScore] = useState(match.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(match.awayScore ?? '');
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const legLabel = match.bracketSlot?.isExtraLeg ? 'Extra' : `Leg ${legIndex + 1}`;

  function handleSave() {
    save<Match>(KEYS.matches, { ...match, homeScore: Number(homeScore), awayScore: Number(awayScore), status: 'finished' });
    advancePlayoffRound(season.id);
    refresh();
  }

  return (
    <div className="playoff-leg">
      {isMultiLeg ? <span className="leg-label">{legLabel}</span> : null}
      <div className="leg-input-row">
        <TeamBadge team={home} />
        <input className="score-input" name="homeScore" type="number" min="0" value={homeScore} onChange={(event) => setHomeScore(event.target.value === '' ? '' : Number(event.target.value))} />
        <span className="leg-sep">-</span>
        <input className="score-input" name="awayScore" type="number" min="0" value={awayScore} onChange={(event) => setAwayScore(event.target.value === '' ? '' : Number(event.target.value))} />
        <TeamBadge team={away} />
        <button className="btn primary btn-xs" type="button" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
