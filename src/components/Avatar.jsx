// Deterministic initials avatar — generated client-side, zero network calls.
const COLORS = ['#7dc96b', '#26c2a3', '#e6913c', '#5b8def', '#c56bd6', '#e0574b', '#d9a441', '#4bbf9f'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name, size = 34, highlight = false }) {
  const label = (name || '?').trim();
  const initials = label.slice(0, 2).toUpperCase();
  const bg = COLORS[hash(label) % COLORS.length];
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.4,
        boxShadow: highlight ? '0 0 0 2px var(--accent)' : 'none',
      }}
      title={label}
    >
      {initials}
    </span>
  );
}
