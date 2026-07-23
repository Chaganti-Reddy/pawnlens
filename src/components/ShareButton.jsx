import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShareNodes, FaCircleCheck } from '../ui/icons.js';
import { buildShareUrl } from '../lib/share.js';

export default function ShareButton({ pgn, side }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = buildShareUrl(pgn, side);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t('review.share'), url);
    }
  };

  return (
    <button className="share-btn" onClick={share} title={t('review.share')}>
      {copied ? <FaCircleCheck /> : <FaShareNodes />} {copied ? t('review.linkCopied') : t('review.share')}
    </button>
  );
}
