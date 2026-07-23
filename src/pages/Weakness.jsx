import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { aggregateWeaknesses, clearHistory, accuracyTrend, worstOpenings } from '../lib/storage.js';
import Dashboard from '../components/Dashboard.jsx';
import AccuracyTrend from '../components/AccuracyTrend.jsx';
import { FaTrashCan } from '../ui/icons.js';

export default function Weakness() {
  const { t } = useTranslation();
  const { history, setHistory, batch, progress } = useReviewer();
  const [params] = useSearchParams();
  const [dashName, setDashName] = useState(params.get('u') || '');

  useEffect(() => {
    const u = params.get('u');
    if (u) setDashName(u);
  }, [params]);

  const knownNames = [...new Set(history.map((h) => h.focusName))].filter(Boolean);
  const data = dashName ? aggregateWeaknesses(dashName) : null;
  const trend = dashName ? accuracyTrend(dashName) : [];
  const openings = dashName ? worstOpenings(dashName) : [];
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  if (batch) {
    return (
      <main className="dash-view">
        <div className="loading">
          <div className="spinner" />
          <p>{t('weakness.analyzingGame', { i: batch.i, n: batch.n, pct })}</p>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${((batch.i - 1 + pct / 100) / batch.n) * 100}%` }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dash-view">
      <div className="dash-controls">
        <input placeholder={t('weakness.yourUsername')} value={dashName} onChange={(e) => setDashName(e.target.value)} />
        <div className="known-names">
          {knownNames.slice(0, 8).map((n) => (
            <button key={n} className={dashName === n ? 'on' : ''} onClick={() => setDashName(n)}>{n}</button>
          ))}
        </div>
        <button className="ghost" onClick={() => { clearHistory(); setHistory([]); }} title={t('weakness.clearTitle')}>
          <FaTrashCan /> {t('weakness.clear', { count: history.length })}
        </button>
      </div>
      {data && trend.length >= 2 && <AccuracyTrend data={trend} />}
      {data && openings.length > 0 && (
        <div className="openings">
          <h3>{t('weakness.worstOpenings')}</h3>
          <div className="openings-list">
            {openings.map((o) => (
              <div className="opening-row" key={o.opening}>
                <span className="op-name">{o.opening}</span>
                <span className="op-games">{t('weakness.gamesCount', { count: o.games })}</span>
                <span className="op-acc">{o.avgAccuracy.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Dashboard data={data} playerName={dashName} />
    </main>
  );
}
