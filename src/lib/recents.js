// Remember recently-searched usernames per source, across refreshes. Local only.
const KEY = 'pawnlens.recents.v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getRecents(source) {
  return read()[source] || [];
}

export function addRecent(source, name) {
  const clean = (name || '').trim();
  if (!clean) return getRecents(source);
  const all = read();
  const list = [clean, ...(all[source] || []).filter((n) => n.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
  all[source] = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  return list;
}

// The user's own identity — the username they search is treated as "me".
const ME_KEY = 'pawnlens.me';
export function getMe() {
  try { return localStorage.getItem(ME_KEY) || ''; } catch { return ''; }
}
export function setMe(name) {
  const clean = (name || '').trim();
  if (!clean) return;
  try { localStorage.setItem(ME_KEY, clean); } catch { /* quota */ }
}

export function removeRecent(source, name) {
  const all = read();
  all[source] = (all[source] || []).filter((n) => n !== name);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  return all[source];
}
