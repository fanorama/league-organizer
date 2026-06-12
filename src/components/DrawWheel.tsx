import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

export interface DrawWheelItem {
  id: string;
  label: string;
  logo?: string | null;
}

export interface DrawWheelHandle {
  /** Putar roda hingga segmen `index` berhenti tepat di bawah pointer. */
  spinTo: (index: number) => Promise<void>;
}

const SEGMENT_COLORS = ['#f0b429', '#e03050', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

function shortLabel(name: string, maxLen: number): string {
  if (maxLen >= name.length) return name;
  const abbr = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || name.slice(0, 3);
  return abbr.toUpperCase();
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const DrawWheel = forwardRef<DrawWheelHandle, { items: DrawWheelItem[]; title: string }>(
  function DrawWheel({ items, title }, ref) {
    const wheelRef = useRef<HTMLDivElement>(null);
    const rotationRef = useRef(0);
    const [spinning, setSpinning] = useState(false);
    const [landedId, setLandedId] = useState<string | null>(null);

    const sliceDeg = items.length > 0 ? 360 / items.length : 0;

    // Reset hasil saat daftar item berubah (mis. item yang menang sudah dipakai).
    useEffect(() => {
      setLandedId((prev) => (prev && items.some((it) => it.id === prev) ? prev : null));
    }, [items]);

    const conicGradient = useMemo(() => {
      if (!items.length) return undefined;
      const stops = items.map((_, i) => {
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return `${color} ${i * sliceDeg}deg ${(i + 1) * sliceDeg}deg`;
      });
      return `conic-gradient(${stops.join(', ')})`;
    }, [items, sliceDeg]);

    const segmentLabels = useMemo(() => {
      const count = items.length;
      const maxLen = count <= 8 ? 14 : count <= 14 ? 10 : 8;
      const fontSize = count <= 8 ? 12 : count <= 14 ? 10 : 8.5;
      return items.map((item, i) => {
        const deg = i * sliceDeg + sliceDeg / 2;
        const barRotation = deg - 90;
        const flip = deg > 180;
        return (
          <span key={item.id} className="wheel-segment-label" style={{ transform: `rotate(${barRotation}deg)` }}>
            <span
              className="wheel-segment-text"
              style={{ fontSize: `${fontSize}px`, transform: flip ? 'rotate(180deg)' : undefined }}
            >
              {shortLabel(item.label, maxLen)}
            </span>
          </span>
        );
      });
    }, [items, sliceDeg]);

    // Putaran pelan saat idle (belum spin & belum ada hasil).
    useEffect(() => {
      if (spinning || landedId || !items.length) return;
      const el = wheelRef.current;
      if (!el || prefersReduced()) return;
      el.style.transition = 'none';
      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = (now - last) / 1000;
        last = now;
        rotationRef.current += 7 * dt;
        el.style.transform = `rotate(${rotationRef.current}deg)`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [spinning, landedId, items.length]);

    useImperativeHandle(
      ref,
      () => ({
        spinTo(index: number) {
          return new Promise<void>((resolve) => {
            if (index < 0 || index >= items.length) {
              resolve();
              return;
            }
            setLandedId(null);
            const segmentCenter = (index * sliceDeg + sliceDeg / 2) % 360;
            const currentPos = ((rotationRef.current % 360) + 360) % 360;
            const delta = ((360 - ((segmentCenter + currentPos) % 360)) % 360 + 360) % 360;
            const reduced = prefersReduced();
            rotationRef.current += (reduced ? 0 : 5 * 360) + delta;

            const el = wheelRef.current;
            if (el) {
              el.style.transition = reduced ? 'none' : 'transform 4s cubic-bezier(0.06, 0.73, 0.14, 1)';
              el.style.transform = `rotate(${rotationRef.current}deg)`;
            }
            setSpinning(true);
            const finish = () => {
              setSpinning(false);
              setLandedId(items[index].id);
              resolve();
            };
            if (reduced) finish();
            else window.setTimeout(finish, 4000);
          });
        },
      }),
      [items, sliceDeg],
    );

    const landed = landedId ? items.find((it) => it.id === landedId) : null;

    return (
      <div className="draw-wheel">
        <div className="draw-wheel__title">{title}</div>
        <div className="wheel-stage draw-wheel__stage">
          <div className="wheel-pointer" />
          <div className={`wheel${spinning ? ' is-spinning' : ''}`} ref={wheelRef} style={{ backgroundImage: conicGradient }}>
            {segmentLabels}
          </div>
          <div className="wheel-hub">
            {landed ? (
              landed.logo ? (
                <img src={landed.logo} alt={landed.label} className="wheel-hub-logo" />
              ) : (
                <span className="wheel-hub-name">{landed.label}</span>
              )
            ) : spinning ? (
              <span className="wheel-hub-text">…</span>
            ) : (
              <span className="wheel-hub-text">{items.length ? title : 'Habis'}</span>
            )}
          </div>
        </div>
      </div>
    );
  },
);
