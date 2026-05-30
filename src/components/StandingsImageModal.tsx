import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StandingsRow } from '../lib/standings';
import { captureCardToPng } from '../lib/captureImage';
import { teamLogoUrl } from '../lib/standingsImage';
import { StandingsImageCard } from './StandingsImageCard';

interface StandingsImageModalProps {
  rows: StandingsRow[];
  leagueName: string;
  seasonNumber: number;
  matchday: number | null;
  dateLabel: string;
  ownerNames: Record<string, string>;
  onClose: () => void;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'liga';
}

export function StandingsImageModal({
  rows, leagueName, seasonNumber, matchday, dateLabel, ownerNames, onClose,
}: StandingsImageModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [settled, setSettled] = useState(0);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const capturedRef = useRef(false);

  const totalLogos = useMemo(() => rows.filter((r) => teamLogoUrl(r.team)).length, [rows]);

  const handleSettled = useCallback(() => setSettled((c) => c + 1), []);
  const handleError = useCallback((id: string) => {
    setFailedLogos((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const runCapture = useCallback(async () => {
    setStatus('loading');
    try {
      if (!cardRef.current) throw new Error('Kartu belum siap');
      if (document.fonts?.ready) await document.fonts.ready;
      const url = await captureCardToPng(cardRef.current);
      setPngUrl(url);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (capturedRef.current) return undefined;
    if (settled < totalLogos) return undefined;
    capturedRef.current = true;
    // beri satu tick agar fallback inisial sempat ter-render sebelum capture
    const timer = setTimeout(runCapture, 50);
    return () => clearTimeout(timer);
  }, [settled, totalLogos, runCapture]);

  function handleDownload() {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `klasemen-${slugify(leagueName)}-musim-${seasonNumber}.png`;
    a.click();
  }

  async function handleShare() {
    if (!pngUrl) return;
    try {
      const blob = await (await fetch(pngUrl)).blob();
      const file = new File([blob], `klasemen-musim-${seasonNumber}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Klasemen ${leagueName}` });
      }
    } catch {
      /* dibatalkan pengguna atau tidak didukung */
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  return (
    <div className="std-image-overlay" role="dialog" aria-modal="true" aria-label="Bagikan gambar klasemen">
      <div style={{ position: 'fixed', left: -10000, top: 0, width: 440, height: 440, pointerEvents: 'none' }} aria-hidden>
        <StandingsImageCard
          innerRef={cardRef}
          rows={rows}
          leagueName={leagueName}
          seasonNumber={seasonNumber}
          matchday={matchday}
          dateLabel={dateLabel}
          ownerNames={ownerNames}
          failedLogos={failedLogos}
          onLogoSettled={handleSettled}
          onLogoError={handleError}
        />
      </div>

      <div className="std-image-modal">
        <header className="std-image-head">
          <h3>Bagikan Klasemen</h3>
          <button className="btn" type="button" onClick={onClose}>Tutup</button>
        </header>
        <div className="std-image-preview">
          {status === 'loading' && <div className="std-image-state">Membuat gambar...</div>}
          {status === 'error' && (
            <div className="std-image-state">
              Gagal membuat gambar.{' '}
              <button className="btn btn-xs" type="button" onClick={runCapture}>Coba lagi</button>
            </div>
          )}
          {status === 'ready' && pngUrl && <img src={pngUrl} alt="Pratinjau klasemen" />}
        </div>
        <footer className="std-image-actions">
          <button className="btn primary" type="button" disabled={status !== 'ready'} onClick={handleDownload}>Unduh</button>
          {canShare && (
            <button className="btn" type="button" disabled={status !== 'ready'} onClick={handleShare}>Bagikan</button>
          )}
        </footer>
      </div>
    </div>
  );
}
