import type { Team } from '../lib/types';

interface TeamBadgeProps {
  team?: Team | null;
}

export function TeamBadge({ team }: TeamBadgeProps) {
  if (!team) return <span className="team-badge">?</span>;

  const value = team.badge || team.shortName || '?';
  if (/^https?:\/\//.test(value)) {
    return (
      <span className="team-badge">
        <img src={value} alt="" />
      </span>
    );
  }
  return <span className="team-badge">{value}</span>;
}
