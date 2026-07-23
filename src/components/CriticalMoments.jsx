import { useTranslation } from 'react-i18next';

// The handful of moves that swung the game most for the focus side — jump straight to them.
export default function CriticalMoments({ moves, focusColor, onSelect, selectedPly }) {
  const { t } = useTranslation();
  const top = moves
    .filter((m) => m.color === focusColor && m.tagKind === 'bad')
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4);
  if (!top.length) return null;

  return (
    <div className="critical">
      <div className="critical-title">{t('review.criticalMoments')}</div>
      <div className="critical-list">
        {top.map((m) => (
          <button
            key={m.ply}
            className={`crit ${m.ply === selectedPly ? 'sel' : ''}`}
            onClick={() => onSelect(m.ply)}
          >
            <span className="crit-mv">{m.moveNumber}{m.color === 'w' ? '.' : '…'} {m.san}</span>
            <span className="crit-tag" style={{ background: m.tagColor }}>{t(`tag.${m.tag}`)}</span>
            <span className="crit-delta">−{Math.round(m.delta)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
