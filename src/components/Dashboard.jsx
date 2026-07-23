import { useTranslation } from 'react-i18next';

// Cross-game weakness report — the thing single-game reviewers don't give you.
export default function Dashboard({ data, playerName }) {
  const { t } = useTranslation();
  if (!data) {
    return (
      <div className="dash empty">
        <p>{t('weakness.empty1', { name: playerName || t('weakness.emptyNoName') })}</p>
        <p className="muted">{t('weakness.empty2')}</p>
      </div>
    );
  }
  const phaseLabel = (p) => (p ? t(`phase.${p}`) : t('phase.none'));
  return (
    <div className="dash">
      <div className="dash-stats">
        <Stat label={t('weakness.statGames')} value={data.gamesAnalyzed} />
        <Stat label={t('weakness.statAccuracy')} value={`${data.avgAccuracy.toFixed(1)}%`} />
        <Stat label={t('weakness.statMistakes')} value={data.mistakesPerGame.toFixed(1)} />
        <Stat label={t('weakness.statPhase')} value={phaseLabel(data.worstPhase)} />
      </div>

      <h3>{t('weakness.recurring')}</h3>
      <div className="dash-cats">
        {data.topCategories.map((c) => (
          <div className="cat" key={c.cat}>
            <div className="cat-head">
              <span className="cat-label">{t(`category.${c.cat}`)}</span>
              <span className="cat-count">{c.count} ({c.pct}%)</span>
            </div>
            <div className="cat-bar">
              <div className="cat-bar-fill" style={{ width: `${c.pct}%` }} />
            </div>
            {c.example && (
              <div className="cat-example">{t('weakness.eg')} {c.example.san}: {c.example.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="stat">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);
