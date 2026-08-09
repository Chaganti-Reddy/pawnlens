import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TAGS } from '../lib/classify.js';
import { formatTimeControl, classifyTimeControl, formatDuration } from '../lib/timecontrol.js';
import { TimeIcon } from './icons.jsx';
import { FaCircleXmark, FaChessKnight } from '../ui/icons.js';

function whiteWin(ev) {
  if (ev?.mate != null) return ev.mate > 0 ? 100 : 0;
  const cp = ev?.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// Animate a number 0 -> target once on mount.
function useCountUp(target, dur = 850) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      setV(target * (1 - Math.pow(1 - p, 3))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

// The reviewed side's single biggest momentum swing.
function biggestSwing(moves, focusColor) {
  let best = null;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].color !== focusColor) continue;
    const before = i === 0 ? 50 : whiteWin(moves[i - 1].evalWhite);
    const after = whiteWin(moves[i].evalWhite);
    const gain = focusColor === 'w' ? after - before : before - after;
    if (!best || Math.abs(gain) > Math.abs(best.gain)) best = { m: moves[i], gain };
  }
  return best;
}

const ORDER = ['Sharp', 'Best', 'Solid', 'Fine', 'Loose', 'Slip', 'Drop'];

export default function GameReport({ analysis, focusColor, onClose }) {
  const { t } = useTranslation();
  const g = analysis.game;
  const accW = useCountUp(analysis.accuracyWhite);
  const accB = useCountUp(analysis.accuracyBlack);
  const swing = biggestSwing(analysis.moves, focusColor);
  const timeClass = g.timeClass || classifyTimeControl(g.timeControl);
  const tcLabel = formatTimeControl(g.timeControl);

  const Side = ({ color, acc }) => {
    const rating = color === 'w' ? analysis.ratingWhite : analysis.ratingBlack;
    const acpl = color === 'w' ? analysis.acplWhite : analysis.acplBlack;
    const counts = analysis.counts[color] || {};
    const avg = color === 'w' ? analysis.avgSecondsWhite : analysis.avgSecondsBlack;
    return (
      <div className={`gr-side ${focusColor === color ? 'focus' : ''}`}>
        <div className="gr-name">{color === 'w' ? g.white : g.black}</div>
        <div className="gr-acc" style={{ color: 'var(--accent)' }}>{acc.toFixed(1)}%</div>
        <div className="gr-sub">{t('report.accuracy')}</div>
        <div className="gr-meta">{t('report.est', { n: rating })} · {t('report.acpl', { n: acpl })}{avg != null ? ` · ${t('review.avgMove', { time: formatDuration(avg) })}` : ''}</div>
        <div className="gr-tags">
          {ORDER.filter((k) => counts[k]).map((k) => (
            <span className="gr-chip" key={k}>
              <span className="gr-dot" style={{ background: TAGS[k].color }} />
              <b>{counts[k]}</b> {t(`tag.${k}`)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="gr-backdrop" onClick={onClose}>
      <div className="gr-card" onClick={(e) => e.stopPropagation()}>
        <button className="gr-close icon-btn" onClick={onClose} aria-label={t('common.close')}><FaCircleXmark /></button>
        <div className="gr-title"><FaChessKnight /> {t('report.title')}</div>
        {g.opening && <div className="gr-opening">{g.opening}</div>}
        {timeClass && (
          <div className="gr-time"><TimeIcon kind={timeClass} />{t(`review.timeClass_${timeClass}`, timeClass)}{tcLabel && ` · ${tcLabel}`}</div>
        )}

        <div className="gr-sides">
          <Side color="w" acc={accW} />
          <div className="gr-vs">{g.result}</div>
          <Side color="b" acc={accB} />
        </div>

        <div className="gr-bar">
          <div className="gr-bar-w" style={{ width: `${(analysis.accuracyWhite / (analysis.accuracyWhite + analysis.accuracyBlack)) * 100}%` }} />
        </div>

        {swing && (
          <div className="gr-moment">
            <span className="gr-moment-label">{t('report.turningPoint')}</span>
            <span>{swing.m.moveNumber}{swing.m.color === 'w' ? '.' : '…'} {swing.m.san}
              <span className="gr-moment-swing" style={{ color: swing.gain >= 0 ? 'var(--accent)' : 'var(--bad)' }}>
                {' '}{swing.gain >= 0 ? '+' : ''}{Math.round(swing.gain)}%
              </span>
            </span>
          </div>
        )}

        <button className="primary gr-go" onClick={onClose}>{t('report.startReview')}</button>
      </div>
    </div>
  );
}
