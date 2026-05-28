import { useEffect, useRef, useState } from 'react';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import type { ClubFromApi } from '../lib/types';

interface ClubPickerModalProps {
  player1Name: string;
  player2Name: string;
  initialP1CompetitionId?: string;
  initialP2CompetitionId?: string;
  onConfirm: (p1Club: ClubFromApi, p2Club: ClubFromApi, p1CompetitionId: string, p2CompetitionId: string) => void;
  onClose: () => void;
}

export function ClubPickerModal({
  player1Name,
  player2Name,
  initialP1CompetitionId = COMPETITIONS[0].id,
  initialP2CompetitionId = COMPETITIONS[0].id,
  onConfirm,
  onClose,
}: ClubPickerModalProps) {
  const [p1CompetitionId, setP1CompetitionId] = useState(initialP1CompetitionId);
  const [p2CompetitionId, setP2CompetitionId] = useState(initialP2CompetitionId);
  const [p1Clubs, setP1Clubs] = useState<ClubFromApi[]>([]);
  const [p2Clubs, setP2Clubs] = useState<ClubFromApi[]>([]);
  const [player1Club, setPlayer1Club] = useState<ClubFromApi | null>(null);
  const [player2Club, setPlayer2Club] = useState<ClubFromApi | null>(null);
  const [p1Loading, setP1Loading] = useState(false);
  const [p2Loading, setP2Loading] = useState(false);
  const [p1Error, setP1Error] = useState('');
  const [p2Error, setP2Error] = useState('');
  const p1FetchSeq = useRef(0);
  const p2FetchSeq = useRef(0);

  useEffect(() => { loadP1Clubs(p1CompetitionId); }, [p1CompetitionId]);
  useEffect(() => { loadP2Clubs(p2CompetitionId); }, [p2CompetitionId]);

  async function loadP1Clubs(competitionId: string) {
    const seq = ++p1FetchSeq.current;
    setP1Loading(true);
    setP1Error('');
    try {
      const clubs = await fetchClubs(competitionId);
      if (seq !== p1FetchSeq.current) return;
      setP1Clubs(clubs);
    } catch (caught) {
      if (seq !== p1FetchSeq.current) return;
      setP1Clubs([]);
      setP1Error(caught instanceof Error ? caught.message : 'Gagal memuat klub.');
    } finally {
      if (seq === p1FetchSeq.current) setP1Loading(false);
    }
  }

  async function loadP2Clubs(competitionId: string) {
    const seq = ++p2FetchSeq.current;
    setP2Loading(true);
    setP2Error('');
    try {
      const clubs = await fetchClubs(competitionId);
      if (seq !== p2FetchSeq.current) return;
      setP2Clubs(clubs);
    } catch (caught) {
      if (seq !== p2FetchSeq.current) return;
      setP2Clubs([]);
      setP2Error(caught instanceof Error ? caught.message : 'Gagal memuat klub.');
    } finally {
      if (seq === p2FetchSeq.current) setP2Loading(false);
    }
  }

  function handleConfirm() {
    if (!player1Club || !player2Club) return;
    onConfirm(player1Club, player2Club, p1CompetitionId, p2CompetitionId);
  }

  return (
    <div className="club-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="club-picker-title">
      <div className="club-picker-modal">
        <header className="club-picker-head">
          <h2 id="club-picker-title">Pilih Klub</h2>
          <button className="btn" type="button" onClick={onClose}>Tutup</button>
        </header>

        <div className="club-picker-layout">
          <ClubGrid
            label={player1Name}
            clubs={p1Clubs}
            selectedClub={player1Club}
            loading={p1Loading}
            error={p1Error}
            competitionId={p1CompetitionId}
            onCompetitionChange={setP1CompetitionId}
            onRetry={() => loadP1Clubs(p1CompetitionId)}
            onSelect={setPlayer1Club}
          />
          <MatchupPreview player1Club={player1Club} player2Club={player2Club} />
          <ClubGrid
            label={player2Name}
            clubs={p2Clubs}
            selectedClub={player2Club}
            loading={p2Loading}
            error={p2Error}
            competitionId={p2CompetitionId}
            onCompetitionChange={setP2CompetitionId}
            onRetry={() => loadP2Clubs(p2CompetitionId)}
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
  error,
  competitionId,
  onCompetitionChange,
  onRetry,
  onSelect,
}: {
  label: string;
  clubs: ClubFromApi[];
  selectedClub: ClubFromApi | null;
  loading: boolean;
  error: string;
  competitionId: string;
  onCompetitionChange: (id: string) => void;
  onRetry: () => void;
  onSelect: (club: ClubFromApi) => void;
}) {
  return (
    <section className="club-picker-side" aria-label={`Klub ${label}`}>
      <h3>{label}</h3>
      <select
        aria-label={`Kompetisi ${label}`}
        value={competitionId}
        onChange={(e) => onCompetitionChange(e.target.value)}
      >
        {COMPETITIONS.map((competition) => (
          <option key={competition.id} value={competition.id}>
            {competition.name}
          </option>
        ))}
      </select>
      {error ? (
        <div className="club-picker-error" aria-live="polite">
          <span>{error}</span>
          <button className="btn btn-xs" type="button" onClick={onRetry}>Coba lagi</button>
        </div>
      ) : null}
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
