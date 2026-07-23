import { useTranslation } from 'react-i18next';
import Avatar from './Avatar.jsx';
import { TimeIcon, ResultBadge, SourceMark } from './icons.jsx';
import { FaAngleRight } from '../ui/icons.js';

// One fetched game, shown visually. `focusName` is the searched user (their side highlighted).
export default function GameCard({ game, focusName, onReview }) {
  const { t } = useTranslation();
  const focus = (focusName || '').toLowerCase();
  const whiteIsFocus = game.white.toLowerCase() === focus;
  const blackIsFocus = game.black.toLowerCase() === focus;

  const Player = ({ name, elo, isFocus }) => (
    <div className={`gc-player ${isFocus ? 'focus' : ''}`}>
      <Avatar name={name} source={game.source} size={30} highlight={isFocus} />
      <span className="gc-name">{name}</span>
      {elo && <span className="gc-elo">{elo}</span>}
    </div>
  );

  return (
    <div className="game-card" onClick={onReview} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onReview()}>
      <div className="gc-left">
        <SourceMark source={game.source} />
        <TimeIcon kind={game.timeClass} />
      </div>
      <div className="gc-players">
        <Player name={game.white} elo={game.whiteElo} isFocus={whiteIsFocus} />
        <Player name={game.black} elo={game.blackElo} isFocus={blackIsFocus} />
      </div>
      <div className="gc-right">
        {game.userResult && <ResultBadge result={game.userResult} />}
        {game.opening && <span className="gc-opening" title={game.opening}>{game.opening}</span>}
        <span className="gc-review">{t('gamecard.review')} <FaAngleRight /></span>
      </div>
    </div>
  );
}
