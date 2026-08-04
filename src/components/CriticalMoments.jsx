import { useTranslation } from 'react-i18next';

function whiteWin(ev) {
  if (ev?.mate != null) return ev.mate > 0 ? 100 : 0;
  const cp = ev?.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// YOUR key moments — the moves where you (the reviewed side) gained or lost the
// most. Not the opponent's; this is about improving your own play.
export default function CriticalMoments({ analysis, focusColor, onSelect, selectedPly }) {
  const { t } = useTranslation();
  const moves = analysis.moves;

  const mine = moves
    .filter((m) => m.color === focusColor)
    .map((m) => {
      const i = m.ply;
      const before = i === 0 ? 50 : whiteWin(moves[i - 1].evalWhite);
      const after = whiteWin(m.evalWhite);
      const swingWhite = after - before;
      const gain = focusColor === 'w' ? swingWhite : -swingWhite; // + good for you
      return { m, gain };
    })
    .filter((s) => Math.abs(s.gain) >= 6)
    .sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain))
    .slice(0, 5)
    .sort((a, b) => a.m.ply - b.m.ply);

  if (!mine.length) return null;

  return (
    <div className="critical">
      <div className="critical-title">{t('review.yourMoments')}</div>
      <div className="critical-sub">{t('review.yourMomentsSub')}</div>
      <div className="critical-list">
        {mine.map(({ m, gain }) => (
          <button key={m.ply} className={`crit ${m.ply === selectedPly ? 'sel' : ''}`} onClick={() => onSelect(m.ply)}>
            <span className="crit-mv">{m.moveNumber}{m.color === 'w' ? '.' : '…'} {m.san}</span>
            <span className="crit-delta" style={{ color: gain >= 0 ? 'var(--accent)' : 'var(--bad)' }}>
              {gain >= 0 ? '+' : ''}{Math.round(gain)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
