import type { Ref } from 'react';
import type { StandingsRow } from '../lib/standings';
import { formatGoalDiff, getInitials, getTeamColor, proxiedLogoUrl, teamLogoUrl } from '../lib/standingsImage';

const STYLE = `
.sic { width:440px; height:440px; border-radius:8px; overflow:hidden; position:relative;
  font-family:'Helvetica Neue',Arial,sans-serif; color:#fff;
  background: radial-gradient(90% 70% at 85% 110%, #8b5cf6 0%, #5b21b6 28%, transparent 60%),
              linear-gradient(155deg,#0b0612 0%, #1a0f2e 55%, #0a0510 100%); }
.sic * { box-sizing:border-box; }
.sic-glow { position:absolute; inset:0; background:radial-gradient(60% 40% at 12% 0%, rgba(139,92,246,.25), transparent 60%); }
.sic-wrap { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:26px 28px 20px; }
.sic-titlewrap { margin-bottom:14px; }
.sic-kick { font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#c4b5fd; font-weight:700; }
.sic-big { font-size:27px; font-weight:800; line-height:1; letter-spacing:-.3px; text-transform:uppercase; margin-top:6px; }
.sic-sub { font-size:11px; letter-spacing:1px; color:rgba(255,255,255,.55); margin-top:7px; }
.sic-colhead { display:flex; align-items:center; font-size:9px; letter-spacing:2px; color:rgba(255,255,255,.42); text-transform:uppercase; padding:0 4px 8px; }
.sic-colhead .sic-nm{flex:1} .sic-colhead .sic-st{width:36px;text-align:center} .sic-colhead .sic-pt{width:44px;text-align:right}
.sic-colhead .sic-rk{width:28px} .sic-colhead .sic-lg{width:32px}
.sic-list { flex:1; display:flex; flex-direction:column; }
.sic-r { display:flex; align-items:center; flex:1; padding:0 4px; position:relative; }
.sic-r > span { position:relative; z-index:1; }
.sic-champ { position:absolute; inset:0 -10px; z-index:0; border-radius:4px;
  background:linear-gradient(90deg, rgba(139,92,246,.26), rgba(139,92,246,0)); }
.sic-rk { width:28px; font-weight:800; font-size:17px; color:rgba(255,255,255,.85); }
.sic-lg { width:24px; height:24px; border-radius:3px; margin-right:13px; flex:none;
  display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; overflow:hidden;
  background:rgba(255,255,255,.08); }
.sic-lg img { width:100%; height:100%; object-fit:contain; }
.sic-nm { flex:1; font-weight:700; font-size:15px; letter-spacing:.3px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sic-st { width:36px; text-align:center; font-size:14px; color:rgba(255,255,255,.7); }
.sic-pt { width:44px; text-align:right; font-weight:800; font-size:18px; }
.sic-r.sic-first .sic-pt { color:#ddd6fe; }
.sic-credit { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,.4); margin-top:10px; text-align:right; }
`;

interface StandingsImageCardProps {
  rows: StandingsRow[];
  leagueName: string;
  seasonNumber: number;
  matchday: number | null;
  dateLabel: string;
  failedLogos: Set<string>;
  onLogoSettled: (teamId: string) => void;
  onLogoError: (teamId: string) => void;
  innerRef?: Ref<HTMLDivElement>;
}

export function StandingsImageCard({
  rows, leagueName, seasonNumber, matchday, dateLabel,
  failedLogos, onLogoSettled, onLogoError, innerRef,
}: StandingsImageCardProps) {
  return (
    <div className="sic" ref={innerRef}>
      <style>{STYLE}</style>
      <div className="sic-glow" />
      <div className="sic-wrap">
        <div className="sic-titlewrap">
          <div className="sic-kick">Klasemen · Musim {seasonNumber}</div>
          <div className="sic-big">{leagueName}</div>
          <div className="sic-sub">{matchday !== null ? `Pekan ${matchday} — ${dateLabel}` : dateLabel}</div>
        </div>
        <div className="sic-colhead">
          <span className="sic-rk" /><span className="sic-lg" /><span className="sic-nm">Tim</span>
          <span className="sic-st">M</span><span className="sic-st">SG</span><span className="sic-pt">Pts</span>
        </div>
        <div className="sic-list">
          {rows.map((row, index) => {
            const url = teamLogoUrl(row.team);
            const showImg = url !== null && !failedLogos.has(row.team.id);
            return (
              <div className={`sic-r${index === 0 ? ' sic-first' : ''}`} key={row.team.id}>
                {index === 0 && <i className="sic-champ" />}
                <span className="sic-rk">{index + 1}</span>
                <span className="sic-lg" style={{ background: showImg ? 'transparent' : getTeamColor(row.team) }}>
                  {showImg ? (
                    <img
                      src={proxiedLogoUrl(url as string)}
                      crossOrigin="anonymous"
                      alt=""
                      onLoad={() => onLogoSettled(row.team.id)}
                      onError={() => { onLogoError(row.team.id); onLogoSettled(row.team.id); }}
                    />
                  ) : getInitials(row.team)}
                </span>
                <span className="sic-nm">{row.team.name}</span>
                <span className="sic-st">{row.played}</span>
                <span className="sic-st">{formatGoalDiff(row.gd)}</span>
                <span className="sic-pt">{row.pts}</span>
              </div>
            );
          })}
        </div>
        <div className="sic-credit">Fanorama League</div>
      </div>
    </div>
  );
}
