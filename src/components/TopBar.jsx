import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo.jsx';
import SettingsMenu from './SettingsMenu.jsx';
import { useReviewer } from '../context/ReviewerContext.jsx';

export default function TopBar() {
  const { t } = useTranslation();
  const { engineStatus, analysis } = useReviewer();
  const cls = ({ isActive }) => (isActive ? 'on' : '');
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo size={30} />
        <span className="brand-name">{t('brand.name')}</span>
        <span className="tagline">{t('brand.tagline')}</span>
      </Link>
      <nav className="topnav">
        <NavLink to="/" end className={cls}>{t('nav.newReview')}</NavLink>
        {analysis && <NavLink to="/review" className={cls}>{t('nav.review')}</NavLink>}
        <NavLink to="/train" className={cls}>{t('nav.train')}</NavLink>
        <NavLink to="/weaknesses" className={cls}>{t('nav.weaknesses')}</NavLink>
        <span className={`engine-dot ${engineStatus}`} title={engineStatus === 'ready' ? t('nav.engineReady') : t('nav.engineLoading')} />
        <SettingsMenu />
      </nav>
    </header>
  );
}
