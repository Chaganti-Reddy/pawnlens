// Player avatars, fetched lazily and cached. chess.com exposes an avatar URL on
// its public profile API; lichess does not serve avatars, so we fall back to
// generated initials there.
const MEM = new Map();
const LS_KEY = 'pawnlens.avatars.v1';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveStore(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

const store = loadStore();
for (const [k, v] of Object.entries(store)) MEM.set(k, v);

function key(source, username) {
  return `${source}:${username.toLowerCase()}`;
}

// Synchronous cache read (null = unknown, '' = known-none).
export function cachedAvatar(source, username) {
  const v = MEM.get(key(source, username));
  return v === undefined ? null : v;
}

// Fetch + cache once. Returns the URL or '' if none.
export async function loadAvatar(source, username) {
  if (source !== 'chess.com') return '';
  const k = key(source, username);
  if (MEM.has(k)) return MEM.get(k);
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${username.toLowerCase()}`);
    if (!res.ok) throw new Error('no profile');
    const data = await res.json();
    const url = data.avatar || '';
    MEM.set(k, url);
    store[k] = url;
    saveStore(store);
    return url;
  } catch {
    MEM.set(k, '');
    return '';
  }
}
