import { useTranslation } from 'react-i18next';

function whiteWin(ev) {
  if (ev?.mate != null) return ev.mate > 0 ? 100 : 0;
  const cp = ev?.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

// The moves where the game's momentum swung the most — either side. Not a
// predictor: it's "where things changed", so you can see exactly how.
export default function CriticalMoments({ analysis, onSelect, selectedPly }) {
  const { t } = useTranslation();
  const moves = analysis.moves;

  const swings = moves.map((m, i) => {
    const before = i === 0 ? 50 : whiteWin(moves[i - 1].evalWhite);
    const after = whiteWin(m.evalWhite);
    const swingWhite = after - before;
    const moverGain = m.color === 'w' ? swingWhite : -swingWhite; // + good for the mover
    return { m, moverGain };
  });

  const top = swings
    .filter((s) => Math.abs(s.moverGain) >= 8)
    .sort((a, b) => Math.abs(b.moverGain) - Math.abs(a.moverGain))
    .slice(0, 5)
    .sort((a, b) => a.m.ply - b.m.ply);

  if (!top.length) return null;

  return (
    <div className="critical">
      <div className="critical-title">{t('review.criticalMoments')}</div>
      <div className="critical-sub">{t('review.criticalSub')}</div>
      <div className="critical-list">
        {top.map(({ m, moverGain }) => (
          <button key={m.ply} className={`crit ${m.ply === selectedPly ? 'sel' : ''}`} onClick={() => onSelect(m.ply)}>
            <span className="crit-side">{m.color === 'w' ? '♔' : '♚'}</span>
            <span className="crit-mv">{m.moveNumber}{m.color === 'w' ? '.' : '…'} {m.san}</span>
            <span className="crit-delta" style={{ color: moverGain >= 0 ? 'var(--accent)' : 'var(--bad)' }}>
              {moverGain >= 0 ? '+' : ''}{Math.round(moverGain)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
