import { FaLightbulb } from '../ui/icons.js';

// The coach's take on the current move + the engine's best line to follow.
export default function CoachCard({ node }) {
  if (!node) return null;
  return (
    <div className="coach" style={{ borderColor: node.tagColor }}>
      <div className="coach-head">
        <span className="coach-move">
          {node.moveNumber}{node.color === 'w' ? '.' : '…'} {node.san}
        </span>
        <span className="coach-tag" style={{ background: node.tagColor }}>
          {node.tagLabel}{node.tagSymbol ? ` ${node.tagSymbol}` : ''}
        </span>
      </div>
      <p className="coach-text">{node.note}</p>
      {node.bestLine?.length > 0 && (
        <div className="best-line">
          <FaLightbulb className="bl-icon" />
          <span className="bl-label">Best line:</span>
          {node.bestLine.map((san, i) => (
            <span className="bl-move" key={i}>{san}</span>
          ))}
        </div>
      )}
    </div>
  );
}
