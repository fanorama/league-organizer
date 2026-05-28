import { useEffect, useMemo, useState } from 'react';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import type { ClubFromApi } from '../lib/types';

interface ClubPickerModalProps {
  player1Name: string;
  player2Name: string;
  initialCompetitionId?: string;
  onConfirm: (p1Club: ClubFromApi, p2Club: ClubFromApi, competitionId: string) => void;
  onClose: () => void;
}

export function ClubPickerModal({
  player1Name,
  player2Name,
  initialCompetitionId = COMPETITIONS[0].id,
  onConfirm,
  onClose,
}: ClubPickerModalProps) {
  const [competitionId, setCompetitionId] = useState(initialCompetitionId);
  const [clubs, setClubs] = useState<ClubFromApi[]>([]);
  const [player1Club, setPlayer1Club] = useState<ClubFromApi | null>(null);
  const [player2Club, setPlayer2Club] = useState<ClubFromApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClubs(competitionId);
  }, [competitionId]);

  const selectedCompetition = useMemo(
    () => COMPETITIONS.find((competition) => competition.id === competitionId),
    [competitionId],
  );

  async function loadClubs(nextCompetitionId = competitionId) {
    setLoading(true);
    setError('');
    try {
      const nextClubs = await fetchClubs(nextCompetitionId);
      setClubs(nextClubs);
    } catch (caught) {
      setClubs([]);
      setError(caught instanceof Error ? caught.message : 'Gagal memuat klub.');
    } finally {
      setLoading(false);
    }
  }

  function handleCompetitionChange(nextCompetitionId: string) {
    setCompetitionId(nextCompetitionId);
    setPlayer1Club(null);
    setPlayer2Club(null);
  }

  function handleConfirm() {
    if (!player1Club || !player2Club) return;
    onConfirm(player1Club, player2Club, competitionId);
  }

  return (
    <div className="club-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="club-picker-title">
      <div className="club-picker-modal">
        <header className="club-picker-head">
          <div>
            <h2 id="club-picker-title">Pilih Klub</h2>
            <p>{selectedCompetition ? `${selectedCompetition.name} - ${selectedCompetition.country}` : 'Kompetisi'}</p>
          </div>
          <button className="btn" type="button" onClick={onClose}>Tutup</button>
        </header>

        <nav className="club-picker-tabs" aria-label="Kompetisi">
          {COMPETITIONS.map((competition) => (
            <button
              className={competition.id === competitionId ? 'club-picker-tab active' : 'club-picker-tab'}
              type="button"
              key={competition.id}
              onClick={() => handleCompetitionChange(competition.id)}
            >
              {competition.name}
            </button>
          ))}
        </nav>

        <div className={error ? 'club-picker-error' : 'club-picker-message'} aria-live="polite">
          {error ? (
            <>
              <span>{error}</span>
              <button className="btn btn-xs" type="button" onClick={() => loadClubs()}>Coba lagi</button>
            </>
          ) : null}
        </div>

        <div className="club-picker-layout">
          <ClubGrid
            label={player1Name}
            clubs={clubs}
            selectedClub={player1Club}
            loading={loading}
            onSelect={setPlayer1Club}
          />
          <MatchupPreview player1Club={player1Club} player2Club={player2Club} />
          <ClubGrid
            label={player2Name}
            clubs={clubs}
            selectedClub={player2Club}
            loading={loading}
            onSelect={setPlayer2Club}
          />
        </div>

        <footer className="club-picker-actions">
          <button className="btn" type="button" onClick={onClose}>Batal</button>
          <button className="btn primary" type="button" disabled={!player1Club || !player2Club} onClick={handleConfirm}>
            Konfirmasi
          </button>
        </footer>
      </div>
    </div>
  );
}

function ClubGrid({
  label,
  clubs,
  selectedClub,
  loading,
  onSelect,
}: {
  label: string;
  clubs: ClubFromApi[];
  selectedClub: ClubFromApi | null;
  loading: boolean;
  onSelect: (club: ClubFromApi) => void;
}) {
  return (
    <section className="club-picker-side" aria-label={`Klub ${label}`}>
      <h3>{label}</h3>
      {loading ? (
        <div className="club-picker-loading">Memuat klub...</div>
      ) : (
        <div className="club-grid">
          {clubs.map((club) => (
            <ClubBadge
              key={club.id}
              club={club}
              playerName={label}
              selected={selectedClub?.id === club.id}
              onClick={() => onSelect(club)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ClubBadge({
  club,
  playerName,
  selected,
  onClick,
}: {
  club: ClubFromApi;
  playerName: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = club.shortName || club.name.slice(0, 3).toUpperCase();

  return (
    <button
      className={selected ? 'club-badge-button club-selected' : 'club-badge-button'}
      type="button"
      aria-pressed={selected}
      aria-label={`Pilih ${club.name} untuk ${playerName}`}
      onClick={onClick}
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

function MatchupPreview({ player1Club, player2Club }: { player1Club: ClubFromApi | null; player2Club: ClubFromApi | null }) {
  return (
    <section className="club-picker-preview" aria-label="Preview pertandingan">
      <PreviewClub club={player1Club} />
      <strong>VS</strong>
      <PreviewClub club={player2Club} />
    </section>
  );
}

function PreviewClub({ club }: { club: ClubFromApi | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!club) return <div className="club-preview-slot">?</div>;
  const fallback = club.shortName || club.name.slice(0, 3).toUpperCase();

  return (
    <div className="club-preview-slot">
      {club.logo && !imageFailed ? <img src={club.logo} alt="" onError={() => setImageFailed(true)} /> : <span>{fallback}</span>}
      <small>{club.name}</small>
    </div>
  );
}
