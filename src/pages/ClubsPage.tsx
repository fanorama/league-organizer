import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMPETITIONS, fetchClubs } from '../lib/api';
import { getClubTiers, saveClubTier, deleteClubTier } from '../lib/storage';
import type { ClubFromApi } from '../lib/types';
import { Shell } from '../components/Shell';
import { useAuthStore } from '../store/useAuthStore';

const TIER_OPTIONS = [
  { value: 'elite', label: 'Elite', className: 'danger' },
  { value: 'mid', label: 'Mid', className: '' },
  { value: 'underdog', label: 'Underdog', className: 'success' },
  { value: null, label: 'None', className: '' },
] as const;

function tierLabel(tier: string): string {
  const labels: Record<string, string> = { elite: 'Elite', mid: 'Mid', underdog: 'Underdog' };
  return labels[tier] || tier;
}

function tierClass(tier: string): string {
  const classes: Record<string, string> = { elite: 'danger', mid: '', underdog: 'success' };
  return classes[tier] || '';
}

function TierPopover({ clubId, currentTier, isAdmin, onTierChange }: {
  clubId: string;
  currentTier: string;
  isAdmin: boolean;
  onTierChange: (id: string, tier: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  async function select(tier: string | null) {
    setOpen(false);
    if (!isAdmin || busy) return;
    setBusy(true);
    setInlineError('');
    try {
      await onTierChange(clubId, tier);
    } catch (err: any) {
      setInlineError(err.message || 'Gagal menyimpan tier');
    } finally {
      setBusy(false);
    }
  }

  const cls = tierClass(currentTier);

  return (
    <span className="tier-badge-wrapper" ref={ref}>
      <span
        className={`badge tier-trigger ${cls}`}
        onClick={isAdmin ? () => setOpen(!open) : undefined}
        title={isAdmin ? 'Klik untuk ubah tier' : undefined}
        style={isAdmin ? { cursor: 'pointer' } : undefined}
        role={isAdmin ? 'button' : undefined}
        tabIndex={isAdmin ? 0 : undefined}
        onKeyDown={isAdmin ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } } : undefined}
      >
        {busy ? '...' : tierLabel(currentTier)}
        {isAdmin && <span className="tier-chevron" aria-hidden>▾</span>}
      </span>
      {open && (
        <div className="tier-popover" role="menu">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`tier-option ${opt.className}`}
              role="menuitem"
              type="button"
              onClick={() => select(opt.value)}
            >
              <span className={`badge tier-option-badge ${opt.className}`}>{opt.label}</span>
              {opt.value === currentTier && (
                <span className="tier-check" aria-label="selected">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
      {inlineError && <span className="muted" style={{ fontSize: 11, marginTop: 2 }}>{inlineError}</span>}
    </span>
  );
}

function ClubLogo({ club }: { club: ClubFromApi }) {
  const [failed, setFailed] = useState(false);
  const fallback = club.shortName || club.name.slice(0, 3).toUpperCase();
  if (club.logo && !failed) {
    return <img src={club.logo} alt="" onError={() => setFailed(true)} />;
  }
  return <span>{fallback}</span>;
}

export function ClubsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [activeTab, setActiveTab] = useState(COMPETITIONS[0].code);
  const [clubs, setClubs] = useState<ClubFromApi[]>([]);
  const [tierMap, setTierMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function loadTab(code: string) {
    setLoading(true);
    setError('');
    setClubs([]);
    setTierMap(new Map());
    setSelectedIds(new Set());
    setQuery('');

    fetchClubs(code)
      .then((data) => {
        setClubs(data);
        if (!data.length) { setLoading(false); return; }
        const ids = data.map((c) => c.id);
        getClubTiers(ids)
          .then((tiers) => {
            const map = new Map<string, string>();
            for (const t of tiers) map.set(t.externalId, t.tier);
            setTierMap(map);
          })
          .catch(() => {});
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Gagal memuat klub');
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const handleTierChange = useCallback(async (clubId: string, tier: string | null) => {
    const prev = tierMap.get(clubId) || 'mid';
    const nextTier = tier || 'mid';

    setTierMap((prevMap) => {
      const next = new Map(prevMap);
      next.set(clubId, nextTier);
      return next;
    });

    try {
      if (tier) {
        await saveClubTier({ externalId: clubId, tier: tier as 'elite' | 'mid' | 'underdog' });
      } else {
        await deleteClubTier(clubId);
      }
    } catch {
      setTierMap((prevMap) => {
        const next = new Map(prevMap);
        if (prev !== 'mid') next.set(clubId, prev);
        else next.delete(clubId);
        return next;
      });
      throw new Error('Gagal menyimpan tier');
    }
  }, [tierMap]);

  async function handleBulkSet(tier: 'elite' | 'mid' | 'underdog') {
    if (!isAdmin || bulkBusy || !selectedIds.size) return;
    setBulkBusy(true);

    const ids = [...selectedIds];
    const prevStates = ids.map((id) => [id, tierMap.get(id) || 'mid'] as const);

    setTierMap((prev) => {
      const next = new Map(prev);
      for (const id of ids) next.set(id, tier);
      return next;
    });
    setSelectedIds(new Set());

    try {
      const upserts = ids.map((id) => saveClubTier({ externalId: id, tier }));
      await Promise.all(upserts);
    } catch {
      setTierMap((prev) => {
        const next = new Map(prev);
        for (const [id, prevTier] of prevStates) {
          if (prevTier !== 'mid') next.set(id, prevTier);
          else next.delete(id);
        }
        return next;
      });
    } finally {
      setBulkBusy(false);
    }
  }

  function handleRetry() {
    loadTab(activeTab);
  }

  function toggleSelect(id: string) {
    if (!isAdmin) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(
    () => (query ? clubs.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : clubs),
    [clubs, query],
  );

  return (
    <Shell active="clubs" title="Clubs">
      <div className="tabs">
        {COMPETITIONS.map((comp) => (
          <button
            key={comp.code}
            type="button"
            className={`tab${activeTab === comp.code ? ' active' : ''}`}
            onClick={() => setActiveTab(comp.code)}
          >
            {comp.name}
          </button>
        ))}
      </div>

      <div className="clubs-banner">
        Pengaturan tier berlaku untuk <strong>import berikutnya</strong> di semua liga.
        Tidak memengaruhi klub yang sudah ada di musim berjalan.
      </div>

      {error ? (
        <div className="club-picker-error" aria-live="polite">
          <span>{error}</span>
          <button className="btn btn-xs" type="button" onClick={handleRetry}>Coba lagi</button>
        </div>
      ) : loading ? (
        <div className="club-picker-loading">Memuat klub...</div>
      ) : (
        <>
          <div className="clubs-toolbar">
            <div className="clubs-search-wrap">
              <span className="clubs-search-icon" aria-hidden>⌕</span>
              <input
                className="clubs-search"
                type="search"
                placeholder="Cari klub..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {isAdmin && selectedIds.size > 0 && (
              <div className="club-bulk">
                <span className="club-bulk-count">{selectedIds.size} dipilih</span>
                <div className="club-bulk-actions">
                  <button
                    className="bulk-tier-btn elite"
                    type="button"
                    disabled={bulkBusy}
                    onClick={() => handleBulkSet('elite')}
                  >
                    Elite
                  </button>
                  <button
                    className="bulk-tier-btn mid"
                    type="button"
                    disabled={bulkBusy}
                    onClick={() => handleBulkSet('mid')}
                  >
                    Mid
                  </button>
                  <button
                    className="bulk-tier-btn underdog"
                    type="button"
                    disabled={bulkBusy}
                    onClick={() => handleBulkSet('underdog')}
                  >
                    Underdog
                  </button>
                </div>
                <button
                  className="club-bulk-clear"
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              {query ? 'Tidak ada klub cocok.' : 'Tidak ada klub ditemukan.'}
            </div>
          ) : (
            <div className="tier-board">
              {filtered.map((club, index) => {
                const tier = tierMap.get(club.id) || 'mid';
                const selected = selectedIds.has(club.id);
                const crest = (
                  <span className="club-card-crest">
                    <ClubLogo club={club} />
                  </span>
                );
                return (
                  <div
                    key={club.id}
                    className="club-card"
                    data-tier={tier}
                    data-selected={selected ? '' : undefined}
                    style={{ animationDelay: `${Math.min(index, 24) * 18}ms` }}
                  >
                    <span className="club-select-check" aria-hidden>✓</span>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="club-card-body"
                        onClick={() => toggleSelect(club.id)}
                        aria-pressed={selected}
                        aria-label={`Pilih ${club.name}`}
                      >
                        {crest}
                        <span className="club-card-name">{club.name}</span>
                      </button>
                    ) : (
                      <div className="club-card-body">
                        {crest}
                        <span className="club-card-name">{club.name}</span>
                      </div>
                    )}
                    <div className="club-card-tier">
                      <TierPopover
                        clubId={club.id}
                        currentTier={tier}
                        isAdmin={isAdmin}
                        onTierChange={handleTierChange}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
