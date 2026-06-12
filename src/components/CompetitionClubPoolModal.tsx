import { useEffect, useMemo, useRef, useState } from 'react';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import type { ClubFromApi, CompetitionClub } from '../lib/types';

interface CompetitionClubPoolModalProps {
  initialSelected: CompetitionClub[];
  onConfirm: (clubs: CompetitionClub[]) => void;
  onClose: () => void;
}

/**
 * Modal pemilihan pool klub untuk undian kompetisi. Mirip ClubPickerModal,
 * tapi multi-select dan lintas-liga: pilihan dipertahankan saat ganti liga.
 */
export function CompetitionClubPoolModal({ initialSelected, onConfirm, onClose }: CompetitionClubPoolModalProps) {
  const [competitionId, setCompetitionId] = useState(COMPETITIONS[0].code);
  const [clubs, setClubs] = useState<ClubFromApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  // Map externalId → snapshot terpilih (lintas-liga).
  const [selected, setSelected] = useState<Map<string, CompetitionClub>>(
    () => new Map(initialSelected.map((c) => [c.externalId, c])),
  );
  const fetchSeq = useRef(0);

  useEffect(() => { loadClubs(competitionId); }, [competitionId]);

  async function loadClubs(id: string) {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchClubs(id);
      if (seq !== fetchSeq.current) return;
      setClubs(data);
    } catch (caught) {
      if (seq !== fetchSeq.current) return;
      setClubs([]);
      setError(caught instanceof Error ? caught.message : 'Gagal memuat klub.');
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clubs.filter((c) => c.name.toLowerCase().includes(q)) : clubs;
  }, [clubs, query]);

  function toggle(club: ClubFromApi) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(club.id)) next.delete(club.id);
      else next.set(club.id, { externalId: club.id, name: club.name, logo: club.logo ?? null });
      return next;
    });
  }
  function toggleAllFiltered() {
    const allOn = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
    setSelected((prev) => {
      const next = new Map(prev);
      filtered.forEach((c) => {
        if (allOn) next.delete(c.id);
        else next.set(c.id, { externalId: c.id, name: c.name, logo: c.logo ?? null });
      });
      return next;
    });
  }

  const filteredAllSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <div className="club-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="pool-picker-title">
      <div className="club-picker-modal">
        <header className="club-picker-head">
          <h2 id="pool-picker-title">Pool klub wheel</h2>
          <button className="btn" type="button" onClick={onClose}>Tutup</button>
        </header>

        <div className="picker-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <select aria-label="Liga" value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
            {COMPETITIONS.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Cari klub…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button className="btn btn-xs" type="button" disabled={!filtered.length} onClick={toggleAllFiltered}>
            {filteredAllSelected ? 'Batalkan liga ini' : 'Pilih liga ini'}
          </button>
          <span className="badge success">{selected.size} dipilih</span>
        </div>

        {error ? (
          <div className="club-picker-error" aria-live="polite">
            <span>{error}</span>
            <button className="btn btn-xs" type="button" onClick={() => loadClubs(competitionId)}>Coba lagi</button>
          </div>
        ) : null}

        {loading ? (
          <div className="club-picker-loading">Memuat klub...</div>
        ) : (
          <div className="club-grid">
            {filtered.map((club) => (
              <ClubBadge key={club.id} club={club} selected={selected.has(club.id)} onClick={() => toggle(club)} />
            ))}
            {!filtered.length ? <p className="muted" style={{ padding: 8 }}>Tidak ada klub.</p> : null}
          </div>
        )}

        <footer className="club-picker-actions">
          <button className="btn" type="button" onClick={onClose}>Batal</button>
          <button className="btn primary" type="button" onClick={() => onConfirm([...selected.values()])}>
            Simpan {selected.size || ''} klub
          </button>
        </footer>
      </div>
    </div>
  );
}

function ClubBadge({ club, selected, onClick }: { club: ClubFromApi; selected: boolean; onClick: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = club.shortName || club.name.slice(0, 3).toUpperCase();
  return (
    <button
      className={selected ? 'club-badge-button club-selected' : 'club-badge-button'}
      type="button"
      aria-pressed={selected}
      aria-label={`Pilih ${club.name}`}
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
