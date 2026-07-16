// Paired move list with classification chips. Click a move to jump to it.
export default function MoveList({ moves, selectedPly, onSelect }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
  }

  const Cell = ({ mv }) => {
    if (!mv) return <span className="mv empty" />;
    const sel = mv.ply === selectedPly;
    return (
      <button
        className={`mv ${sel ? 'sel' : ''} ${mv.tagKind}`}
        onClick={() => onSelect(mv.ply)}
        title={`${mv.tagLabel}${mv.tagSymbol ? ' ' + mv.tagSymbol : ''}`}
      >
        <span className="mv-san">{mv.san}</span>
        {mv.tagSymbol && (
          <span className="mv-sym" style={{ color: mv.tagColor }}>
            {mv.tagSymbol}
          </span>
        )}
        <span className="mv-dot" style={{ background: mv.tagColor }} />
      </button>
    );
  };

  return (
    <div className="movelist">
      {rows.map((r) => (
        <div className="mv-row" key={r.num}>
          <span className="mv-num">{r.num}.</span>
          <Cell mv={r.white} />
          <Cell mv={r.black} />
        </div>
      ))}
    </div>
  );
}
