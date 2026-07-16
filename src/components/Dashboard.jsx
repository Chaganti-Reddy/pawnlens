// Cross-game weakness report — the thing single-game reviewers don't give you.
export default function Dashboard({ data, playerName }) {
  if (!data) {
    return (
      <div className="dash empty">
        <p>No saved games for <b>{playerName || 'this player'}</b> yet.</p>
        <p className="muted">Analyze a few games (they save to your browser) to unlock your weakness report.</p>
      </div>
    );
  }
  return (
    <div className="dash">
      <div className="dash-stats">
        <Stat label="Games" value={data.gamesAnalyzed} />
        <Stat label="Avg accuracy" value={`${data.avgAccuracy.toFixed(1)}%`} />
        <Stat label="Mistakes / game" value={data.mistakesPerGame.toFixed(1)} />
        <Stat label="Weakest phase" value={cap(data.worstPhase)} />
      </div>

      <h3>Your recurring mistakes</h3>
      <div className="dash-cats">
        {data.topCategories.map((c) => (
          <div className="cat" key={c.cat}>
            <div className="cat-head">
              <span className="cat-label">{c.label}</span>
              <span className="cat-count">{c.count} ({c.pct}%)</span>
            </div>
            <div className="cat-bar">
              <div className="cat-bar-fill" style={{ width: `${c.pct}%` }} />
            </div>
            {c.example && (
              <div className="cat-example">e.g. {c.example.san}: {c.example.note}</div>
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

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '—');
