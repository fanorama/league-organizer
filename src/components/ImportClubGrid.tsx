import { useState } from 'react';
import type { ClubFromApi } from '../lib/types';

interface ImportClubGridProps {
  clubs: ClubFromApi[];
  selectedIds: Set<string>;
  poolIds: Set<string>;
  loading: boolean;
  error: string;
  onToggle: (id: string) => void;
  onRetry: () => void;
}

export function ImportClubGrid({
  clubs,
  selectedIds,
  poolIds,
  loading,
  error,
  onToggle,
  onRetry,
}: ImportClubGridProps) {
  if (error) {
    return (
      <div className="club-picker-error" aria-live="polite">
        <span>{error}</span>
        <button className="btn btn-xs" type="button" onClick={onRetry}>Coba lagi</button>
      </div>
    );
  }

  if (loading) {
    return <div className="club-picker-loading">Memuat klub...</div>;
  }

  return (
    <div className="club-grid">
      {clubs.map((club) => (
        <ImportClubBadge
          key={club.id}
          club={club}
          selected={selectedIds.has(club.id)}
          inPool={poolIds.has(club.id)}
          onToggle={() => onToggle(club.id)}
        />
      ))}
    </div>
  );
}

function ImportClubBadge({
  club,
  selected,
  inPool,
  onToggle,
}: {
  club: ClubFromApi;
  selected: boolean;
  inPool: boolean;
  onToggle: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = club.shortName || club.name.slice(0, 3).toUpperCase();

  return (
    <button
      className={`club-badge-button${selected ? ' club-selected' : ''}${inPool ? ' club-in-pool' : ''}`}
      type="button"
      disabled={inPool}
      aria-pressed={selected}
      aria-label={inPool ? `${club.name} sudah ada di pool` : `Pilih ${club.name} untuk diimpor`}
      onClick={inPool ? undefined : onToggle}
    >
      {club.logo && !imageFailed ? (
        <img src={club.logo} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span>{fallback}</span>
      )}
      <small>{club.name}</small>
    </button>
  );
}
