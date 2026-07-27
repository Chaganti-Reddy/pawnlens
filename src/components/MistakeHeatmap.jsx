import { useTranslation } from 'react-i18next';

// When in the game do mistakes cluster? Bars by move-number bucket; tap to inspect.
export default function MistakeHeatmap({ data, selected, onSelect }) {
  const { t } = useTranslation();
  if (!data || !data.some((b) => b.count > 0)) return null;
  return (
    <div className="heatmap">
      <h3>{t('weakness.heatmap')}</h3>
      <div className="heatmap-bars">
        {data.map((b) => (
          <button
            className={`hm-col ${selected === b.label ? 'sel' : ''} ${b.count ? '' : 'empty'}`}
            key={b.label}
            onClick={() => b.count && onSelect(selected === b.label ? null : b.label)}
          >
            <div className="hm-bar-wrap">
              <div className="hm-bar" style={{ height: `${b.pct}%` }} />
            </div>
            <div className="hm-count">{b.count}</div>
            <div className="hm-label">{b.label}</div>
          </button>
        ))}
      </div>
      <div className="heatmap-foot">{t('weakness.heatmapFoot')}</div>
    </div>
  );
}
