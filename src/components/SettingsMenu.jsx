import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGear, FaSun, FaMoon, FaVolumeHigh, FaVolumeXmark, FaKeyboard } from '../ui/icons.js';
import { getTheme, applyTheme, getBoardTheme, setBoardTheme, BOARD_THEMES } from '../lib/theme.js';
import { isSoundOn, setSoundOn } from '../lib/sound.js';
import ShortcutsHelp from './ShortcutsHelp.jsx';

export default function SettingsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const [board, setBoard] = useState(getBoardTheme());
  const [sound, setSound] = useState(isSoundOn());
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); applyTheme(next); };
  const pickBoard = (key) => { setBoard(key); setBoardTheme(key); };
  const toggleSound = () => { const next = !sound; setSound(next); setSoundOn(next); };

  return (
    <div className="settings" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} title={t('settings.title')} aria-label={t('settings.title')}>
        <FaGear />
      </button>
      {open && (
        <div className="settings-panel">
          <button className="settings-row" onClick={toggleTheme}>
            {theme === 'dark' ? <FaMoon /> : <FaSun />} {t('settings.theme')}: <b>{theme === 'dark' ? t('settings.dark') : t('settings.light')}</b>
          </button>
          <div className="settings-row static">
            <span>{t('settings.board')}</span>
            <span className="swatches">
              {Object.entries(BOARD_THEMES).map(([key, b]) => (
                <button key={key} className={`swatch ${board === key ? 'on' : ''}`} title={b.name}
                  onClick={() => pickBoard(key)} style={{ background: `linear-gradient(135deg, ${b.light} 50%, ${b.dark} 50%)` }} />
              ))}
            </span>
          </div>
          <button className="settings-row" onClick={toggleSound}>
            {sound ? <FaVolumeHigh /> : <FaVolumeXmark />} {t('settings.sound')}: <b>{sound ? t('settings.on') : t('settings.off')}</b>
          </button>
          <button className="settings-row" onClick={() => { setHelp(true); setOpen(false); }}>
            <FaKeyboard /> {t('settings.shortcuts')}
          </button>
        </div>
      )}
      {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
    </div>
  );
}
