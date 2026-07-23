import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <span>
        <a href="https://github.com/nmrugg/stockfish.js" target="_blank" rel="noopener noreferrer">
          {t('footer.attribution')}
        </a>{' '}
        {t('footer.notAffiliated')}
      </span>
      <a href="https://github.com/Chaganti-Reddy/pawnlens" target="_blank" rel="noopener noreferrer">
        {t('footer.source')}
      </a>
    </footer>
  );
}
