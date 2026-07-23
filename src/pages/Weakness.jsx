import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { aggregateWeaknesses, clearHistory } from '../lib/storage.js';
import Dashboard from '../components/Dashboard.jsx';
import { FaTrashCan } from '../ui/icons.js';

export default function Weakness() {
  const { history, setHistory, batch, progress } = useReviewer();
  const [params] = useSearchParams();
  const [dashName, setDashName] = useState(params.get('u') || '');

  useEffect(() => {
    const u = params.get('u');
    if (u) setDashName(u);
  }, [params]);

  const knownNames = [...new Set(history.map((h) => h.focusName))].filter(Boolean);
  const data = dashName ? aggregateWeaknesses(dashName) : null;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  if (batch) {
    return (
      <main className="dash-view">
        <div className="loading">
          <div className="spinner" />
          <p>Analyzing game {batch.i} of {batch.n}… {pct}%</p>
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
        <input placeholder="Your username" value={dashName} onChange={(e) => setDashName(e.target.value)} />
        <div className="known-names">
          {knownNames.slice(0, 8).map((n) => (
            <button key={n} className={dashName === n ? 'on' : ''} onClick={() => setDashName(n)}>{n}</button>
          ))}
        </div>
        <button className="ghost" onClick={() => { clearHistory(); setHistory([]); }} title="Delete all locally-stored games">
          <FaTrashCan /> Clear ({history.length})
        </button>
      </div>
      <Dashboard data={data} playerName={dashName} />
    </main>
  );
}
