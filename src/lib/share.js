// Encode a game into a shareable URL (PGN + reviewed side), all in the fragment.
// No server: the whole game rides in the link.
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(pgn, side) {
  const params = new URLSearchParams();
  params.set('g', toBase64Url(pgn));
  params.set('s', side);
  return `${window.location.origin}/review?${params.toString()}`;
}

export function parseSharedGame(search) {
  const params = new URLSearchParams(search);
  const g = params.get('g');
  if (!g) return null;
  try {
    return { pgn: fromBase64Url(g), side: params.get('s') === 'b' ? 'b' : 'w' };
  } catch {
    return null;
  }
}
