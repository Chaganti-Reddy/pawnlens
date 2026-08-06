import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaCircleXmark, FaChessKnight } from '../ui/icons.js';

const COLORS = ['#7dc96b', '#26c2a3', '#e6c14b', '#e0574b', '#5b8def', '#c56bd6'];

// Shown when you reach the end of the review — celebrates a win, consoles a loss.
export default function EndCard({ outcome, onClose }) {
  const { t } = useTranslation();
  const win = outcome === 'win';
  const key = win ? 'end.win' : outcome === 'draw' ? 'end.draw' : 'end.loss';

  const confetti = useMemo(
    () => (win ? Array.from({ length: 26 }, (_, i) => ({
      left: Math.random() * 100,
      bg: COLORS[i % COLORS.length],
      delay: Math.random() * 0.4,
      dur: 1.1 + Math.random() * 1.1,
      rot: Math.random() * 360,
    })) : []),
    [win]
  );

  return (
    <div className="endcard" onClick={onClose}>
      {win && (
        <div className="confetti" aria-hidden>
          {confetti.map((c, i) => (
            <span key={i} style={{ left: `${c.left}%`, background: c.bg, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, transform: `rotate(${c.rot}deg)` }} />
          ))}
        </div>
      )}
      <div className={`endcard-msg ${outcome}`} onClick={(e) => e.stopPropagation()}>
        <div className="endcard-icon">
          {win ? <FaCircleCheck /> : outcome === 'draw' ? <FaChessKnight /> : <FaCircleXmark />}
        </div>
        <div className="endcard-title">{t(`${key}.title`)}</div>
        <div className="endcard-sub">{t(`${key}.sub`)}</div>
        <button className="primary" onClick={onClose}>{t('end.done')}</button>
      </div>
    </div>
  );
}
