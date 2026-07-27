import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { aggregateWeaknesses, clearHistory, accuracyTrend, worstOpenings, mistakeHeatmap } from '../lib/storage.js';
import Dashboard from '../components/Dashboard.jsx';
import AccuracyTrend from '../components/AccuracyTrend.jsx';
import MistakeHeatmap from '../components/MistakeHeatmap.jsx';
import { FaTrashCan } from '../ui/icons.js';

export default function Weakness() {
  const { t } = useTranslation();
  const { history, setHistory, batch, progress, reviewStoredMove } = useReviewer();
  const [params] = useSearchParams();
  const [dashName, setDashName] = useState(params.get('u') || '');
  const [bucket, setBucket] = useState(null);

  useEffect(() => {
    const u = params.get('u');
    if (u) setDashName(u);
  }, [params]);

  const knownNames = [...new Set(history.map((h) => h.focusName))].filter(Boolean);
  const data = dashName ? aggregateWeaknesses(dashName) : null;
  const trend = dashName ? accuracyTrend(dashName) : [];
  const openings = dashName ? worstOpenings(dashName) : [];
  const heatmap = dashName ? mistakeHeatmap(dashName) : [];
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
      {data && <MistakeHeatmap data={heatmap} selected={bucket} onSelect={setBucket} />}
      {data && bucket && (
        <div className="bucket-evidence">
          <h4>{t('weakness.bucketMistakes', { range: bucket })}</h4>
          {(heatmap.find((b) => b.label === bucket)?.items || []).map((inst, i) => (
            <div className="evidence-row" key={i}>
              <div className="ev-main">
                <span className="ev-game">{inst.white} {t('weakness.vs')} {inst.black}</span>
                <span className="ev-move">{t('weakness.atMove', { n: inst.moveNumber })} · {inst.san}</span>
              </div>
              <div className="ev-note">{inst.note}</div>
              {inst.pgn && <button className="ev-review" onClick={() => reviewStoredMove(inst)}>{t('weakness.reviewMove')}</button>}
            </div>
          ))}
        </div>
      )}
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
