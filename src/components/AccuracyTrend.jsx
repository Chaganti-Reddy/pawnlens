import { useTranslation } from 'react-i18next';

// Accuracy over your recent analyzed games — are you improving?
export default function AccuracyTrend({ data }) {
  const { t } = useTranslation();
  if (!data || data.length < 2) return null;

  const W = 100, H = 30;
  const xs = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys = data.map((d) => H - (d.accuracy / 100) * H);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  const first = data[0].accuracy;
  const last = data[data.length - 1].accuracy;
  const delta = last - first;

  return (
    <div className="trend">
      <div className="trend-head">
        <span className="trend-title">{t('weakness.trend')}</span>
        <span className={`trend-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </span>
      </div>
      <svg className="trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1" />
      </svg>
      <div className="trend-foot">{t('weakness.trendFoot', { count: data.length })}</div>
    </div>
  );
}
