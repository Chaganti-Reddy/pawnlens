// Light/dark UI theme + board color presets. Persisted in localStorage.
const THEME_KEY = 'pawnlens.theme';
const BOARD_KEY = 'pawnlens.board';

export const BOARD_THEMES = {
  green: { name: 'Green', dark: '#6b8f5e', light: '#e9edcc' },
  brown: { name: 'Brown', dark: '#b58863', light: '#f0d9b5' },
  blue: { name: 'Blue', dark: '#6f92b8', light: '#dee3e6' },
  slate: { name: 'Slate', dark: '#6d7583', light: '#cfd4dc' },
};

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* quota */ }
}
export function getBoardTheme() {
  const key = localStorage.getItem(BOARD_KEY);
  return BOARD_THEMES[key] ? key : 'green';
}
export function setBoardTheme(key) {
  try { localStorage.setItem(BOARD_KEY, key); } catch { /* quota */ }
}

const PIECE_KEY = 'pawnlens.pieces';
export function getPieceSet() {
  return localStorage.getItem(PIECE_KEY) || 'default';
}
export function setPieceSet(key) {
  try { localStorage.setItem(PIECE_KEY, key); } catch { /* quota */ }
}

// Show legal-move hint dots in the trainer.
const HINTS_KEY = 'pawnlens.hints';
export function getHints() {
  return localStorage.getItem(HINTS_KEY) === 'on';
}
export function setHints(on) {
  try { localStorage.setItem(HINTS_KEY, on ? 'on' : 'off'); } catch { /* quota */ }
}
