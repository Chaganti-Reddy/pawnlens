import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleXmark } from '../ui/icons.js';

const SHORTCUTS = [
  { keys: '←  →', descKey: 'shortcuts.prevNext' },
  { keys: 'Home  End', descKey: 'shortcuts.startEnd' },
];

export default function ShortcutsHelp({ onClose }) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('settings.shortcuts')}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><FaCircleXmark /></button>
        </div>
        <ul className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <li key={s.keys}><kbd>{s.keys}</kbd><span>{t(s.descKey)}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
