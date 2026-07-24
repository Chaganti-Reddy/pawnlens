import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShareNodes, FaCircleCheck } from '../ui/icons.js';
import { buildAnnotatedPgn, downloadText, suggestFilename } from '../lib/exportGame.js';
import { buildShareUrl } from '../lib/share.js';

// Take the lesson with you: annotated PGN download, FEN copy, share link.
export default function ExportMenu({ analysis, focusColor, currentFen }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState('');

  const flash = (what) => { setCopied(what); setTimeout(() => setCopied(''), 1600); };
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); flash(what); }
    catch { window.prompt(t('review.export'), text); }
  };

  return (
    <div className="export-menu">
      <button className="export-btn" onClick={() => downloadText(suggestFilename(analysis), buildAnnotatedPgn(analysis))}>
        {t('export.pgn')}
      </button>
      <button className="export-btn" onClick={() => copy(currentFen, 'fen')}>
        {copied === 'fen' ? <FaCircleCheck /> : null} {copied === 'fen' ? t('export.copied') : t('export.fen')}
      </button>
      <button className="export-btn" onClick={() => copy(buildShareUrl(analysis.game.pgn, focusColor), 'link')}>
        {copied === 'link' ? <FaCircleCheck /> : <FaShareNodes />} {copied === 'link' ? t('export.copied') : t('review.share')}
      </button>
    </div>
  );
}
