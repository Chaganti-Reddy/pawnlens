import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo.jsx';
import { useReviewer } from '../context/ReviewerContext.jsx';

export default function TopBar() {
  const { t } = useTranslation();
  const { engineStatus, analysis } = useReviewer();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo size={30} />
        <span className="brand-name">{t('brand.name')}</span>
        <span className="tagline">{t('brand.tagline')}</span>
      </Link>
      <nav className="topnav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>{t('nav.newReview')}</NavLink>
        {analysis && <NavLink to="/review" className={({ isActive }) => (isActive ? 'on' : '')}>{t('nav.review')}</NavLink>}
        <NavLink to="/weaknesses" className={({ isActive }) => (isActive ? 'on' : '')}>{t('nav.weaknesses')}</NavLink>
        <span className={`engine-dot ${engineStatus}`} title={engineStatus === 'ready' ? t('nav.engineReady') : t('nav.engineLoading')} />
      </nav>
    </header>
  );
}
