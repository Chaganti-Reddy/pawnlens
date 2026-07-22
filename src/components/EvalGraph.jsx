// Whole-game evaluation graph (White win% over time). Click to jump to a move.
function winFromEval(ev) {
  if (ev?.mate != null) return ev.mate > 0 ? 100 : 0;
  const cp = ev?.cp ?? 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

const W = 100;
const H = 40;

export default function EvalGraph({ series, selectedPly, onSelect }) {
  if (!series?.length) return null;
  const n = series.length - 1; // number of moves
  const x = (i) => (n === 0 ? 0 : (i / n) * W);
  const y = (ev) => H - (winFromEval(ev) / 100) * H;

  const pts = series.map((ev, i) => `${x(i)},${y(ev)}`).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;
  const selIdx = selectedPly + 1;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(frac * n);
    onSelect(Math.max(-1, Math.min(n - 1, idx - 1)));
  };

  return (
    <div className="eval-graph" onClick={handleClick} title="Click to jump to a move">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={W} height={H} fill="#20201d" />
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#4a473f" strokeWidth="0.4" strokeDasharray="1 1" />
        <polygon points={area} fill="rgba(245,245,245,0.85)" />
        <polyline points={pts} fill="none" stroke="#7dc96b" strokeWidth="0.6" />
        {selIdx >= 0 && (
          <line x1={x(selIdx)} y1="0" x2={x(selIdx)} y2={H} stroke="#e6c14b" strokeWidth="0.7" />
        )}
      </svg>
    </div>
  );
}
