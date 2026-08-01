import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReviewer } from '../context/ReviewerContext.jsx';
import { getRecents, addRecent, removeRecent } from '../lib/recents.js';
import GameCard from '../components/GameCard.jsx';
import { SourceMark } from '../components/icons.jsx';
import { FaXmark, FaMagnifyingGlass } from '../ui/icons.js';

const DEPTHS = [{ key: 'depthFast', value: 10 }, { key: 'depthBalanced', value: 14 }, { key: 'depthDeep', value: 18 }];
const COUNTS = [10, 25, 50, 100];
const SOURCE_LABEL = { chesscom: 'chess.com', lichess: 'lichess' };

export default function Home() {
  const { t } = useTranslation();
  const { fetchGames, loadPgnText, games, lastQuery, busy, error, runAnalysis, runBatch, depth, setDepth, source } = useReviewer();
  const [tab, setTab] = useState('chesscom');
  const [username, setUsername] = useState('');
  const [pgnText, setPgnText] = useState('');
  const [count, setCount] = useState(25);
  const [recents, setRecents] = useState(getRecents('chesscom'));
  const [fResult, setFResult] = useState('all');
  const [fTime, setFTime] = useState('all');
  const [fOpening, setFOpening] = useState('all');

  useEffect(() => { setRecents(getRecents(tab)); }, [tab, games]);
  useEffect(() => { setFResult('all'); setFTime('all'); setFOpening('all'); }, [games]);

  const submit = (name) => {
    if (tab === 'pgn') { loadPgnText(pgnText); return; }
    const n = (name ?? username).trim();
    if (name != null) setUsername(name);
    fetchGames(tab, n, count);
    setRecents(addRecent(tab, n));
  };

  const showList = games.length > 0 && (tab === 'pgn' ? source === 'pgn' : source === tab);
  const openingsInGames = [...new Set(games.map((g) => g.opening).filter(Boolean))];
  const timesInGames = [...new Set(games.map((g) => g.timeClass).filter(Boolean))];
  const filtered = games.filter((g) =>
    (fResult === 'all' || g.userResult === fResult) &&
    (fTime === 'all' || g.timeClass === fTime) &&
    (fOpening === 'all' || g.opening === fOpening)
  );

  return (
    <main className="input-view">
      <div className="tabs">
        {['chesscom', 'lichess', 'pgn'].map((tb) => (
          <button key={tb} className={tab === tb ? 'on' : ''} onClick={() => setTab(tb)}>
            {tb !== 'pgn' ? <SourceMark source={SOURCE_LABEL[tb]} /> : null}
            {tb === 'chesscom' ? t('home.tabChesscom') : tb === 'lichess' ? t('home.tabLichess') : t('home.tabPgn')}
          </button>
        ))}
      </div>

      <div className="input-row">
        {tab === 'pgn' ? (
          <div className="pgn-box">
            <textarea className="pgn-input" placeholder={t('home.pgnPlaceholder')} value={pgnText} onChange={(e) => setPgnText(e.target.value)} />
            <label className="pgn-file">
              {t('home.uploadPgn')}
              <input type="file" accept=".pgn,.txt" hidden onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPgnText(String(reader.result || ''));
                reader.readAsText(file);
              }} />
            </label>
          </div>
        ) : (
          <input className="user-input" placeholder={t('home.usernamePlaceholder', { site: SOURCE_LABEL[tab] })} value={username}
            onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus />
        )}
        {tab !== 'pgn' && (
          <select className="count-pick" value={count} onChange={(e) => setCount(Number(e.target.value))} title={t('home.howManyGames')}>
            {COUNTS.map((c) => <option key={c} value={c}>{t('home.countGames', { count: c })}</option>)}
          </select>
        )}
        <button className="primary" onClick={() => submit()} disabled={busy}>
          <FaMagnifyingGlass /> {busy ? t('home.loading') : tab === 'pgn' ? t('home.loadPgn') : t('home.getGames')}
        </button>
      </div>

      {error && <div className="inline-error">{error}</div>}

      {tab !== 'pgn' && recents.length > 0 && (
        <div className="recents">
          <span className="recents-label">{t('home.recent')}</span>
          {recents.map((n) => (
            <span className="pill" key={n}>
              <button className="pill-main" onClick={() => submit(n)}>{n}</button>
              <button className="pill-x" onClick={() => setRecents(removeRecent(tab, n))} title={t('home.remove')}><FaXmark /></button>
            </span>
          ))}
        </div>
      )}

      {showList && (
        <>
          <div className="filters">
            <select value={fResult} onChange={(e) => setFResult(e.target.value)}>
              <option value="all">{t('home.filterAllResults')}</option>
              <option value="win">{t('home.filterWins')}</option>
              <option value="loss">{t('home.filterLosses')}</option>
              <option value="draw">{t('home.filterDraws')}</option>
            </select>
            {timesInGames.length > 1 && (
              <select value={fTime} onChange={(e) => setFTime(e.target.value)}>
                <option value="all">{t('home.filterAllTimes')}</option>
                {timesInGames.map((tc) => <option key={tc} value={tc}>{tc}</option>)}
              </select>
            )}
            {openingsInGames.length > 1 && (
              <select value={fOpening} onChange={(e) => setFOpening(e.target.value)}>
                <option value="all">{t('home.filterAllOpenings')}</option>
                {openingsInGames.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            )}
          </div>
          {lastQuery && (
            <div className="batch-bar">
              <span>{t('home.gamesLoaded', { count: filtered.length })} <b>{lastQuery}</b></span>
              <button className="primary sm" onClick={() => runBatch(filtered)}>{t('home.analyzeAll')}</button>
            </div>
          )}
          <div className="picker">
            {filtered.map((g, i) => <GameCard key={i} game={g} focusName={lastQuery} onReview={() => runAnalysis(g)} />)}
          </div>
        </>
      )}

      <div className="depth-row">
        <span className="depth-label">{t('home.engineDepth')}</span>
        <div className="depth-pick">
          {DEPTHS.map((d) => (
            <button key={d.value} className={depth === d.value ? 'on' : ''} onClick={() => setDepth(d.value)}>{t(`home.${d.key}`)}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
