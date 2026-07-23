// Real avatar when we can fetch one (chess.com), else a deterministic initials tile.
import { useEffect, useState } from 'react';
import { cachedAvatar, loadAvatar } from '../lib/avatars.js';

const COLORS = ['#7dc96b', '#26c2a3', '#e6913c', '#5b8def', '#c56bd6', '#e0574b', '#d9a441', '#4bbf9f'];
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({ name, source = 'pgn', size = 34, highlight = false }) {
  const label = (name || '?').trim();
  const [url, setUrl] = useState(cachedAvatar(source === 'chess.com' || source === 'chesscom' ? 'chess.com' : source, label) || '');

  useEffect(() => {
    let alive = true;
    const src = source === 'chesscom' ? 'chess.com' : source;
    if (src === 'chess.com' && !url) {
      loadAvatar(src, label).then((u) => alive && u && setUrl(u));
    }
    return () => { alive = false; };
  }, [label, source, url]);

  const ring = highlight ? '0 0 0 2px var(--accent)' : 'none';

  if (url) {
    return (
      <img
        className="avatar avatar-img"
        src={url}
        alt={label}
        title={label}
        width={size}
        height={size}
        style={{ boxShadow: ring }}
        onError={() => setUrl('')}
      />
    );
  }

  const initials = label.slice(0, 2).toUpperCase();
  const bg = COLORS[hash(label) % COLORS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.4, boxShadow: ring }} title={label}>
      {initials}
    </span>
  );
}
