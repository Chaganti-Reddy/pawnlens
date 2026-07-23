import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useReviewer } from '../context/ReviewerContext.jsx';

export default function TopBar() {
  const { engineStatus, analysis } = useReviewer();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <Logo size={30} />
        <span className="brand-name">PawnLens</span>
        <span className="tagline">free unlimited game review</span>
      </Link>
      <nav className="topnav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>New review</NavLink>
        {analysis && <NavLink to="/review" className={({ isActive }) => (isActive ? 'on' : '')}>Review</NavLink>}
        <NavLink to="/weaknesses" className={({ isActive }) => (isActive ? 'on' : '')}>My weaknesses</NavLink>
        <span className={`engine-dot ${engineStatus}`} title={engineStatus === 'ready' ? 'Engine ready' : 'Loading engine…'} />
      </nav>
    </header>
  );
}
