import { useTranslation } from 'react-i18next';

// When in the game do mistakes cluster? Bars by move-number bucket.
export default function MistakeHeatmap({ data }) {
  const { t } = useTranslation();
  if (!data || !data.some((b) => b.count > 0)) return null;
  return (
    <div className="heatmap">
      <h3>{t('weakness.heatmap')}</h3>
      <div className="heatmap-bars">
        {data.map((b) => (
          <div className="hm-col" key={b.label}>
            <div className="hm-bar-wrap">
              <div className="hm-bar" style={{ height: `${b.pct}%` }} title={`${b.count}`} />
            </div>
            <div className="hm-count">{b.count}</div>
            <div className="hm-label">{b.label}</div>
          </div>
        ))}
      </div>
      <div className="heatmap-foot">{t('weakness.heatmapFoot')}</div>
    </div>
  );
}
