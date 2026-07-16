import Avatar from './Avatar.jsx';
import { TimeIcon, ResultBadge, SourceMark } from './icons.jsx';

// One fetched game, shown visually. `focusName` is the searched user (their side gets highlighted).
export default function GameCard({ game, focusName, onReview }) {
  const focus = (focusName || '').toLowerCase();
  const whiteIsFocus = game.white.toLowerCase() === focus;
  const blackIsFocus = game.black.toLowerCase() === focus;

  const Player = ({ name, elo, isFocus }) => (
    <div className={`gc-player ${isFocus ? 'focus' : ''}`}>
      <Avatar name={name} size={30} highlight={isFocus} />
      <span className="gc-name">{name}</span>
      {elo && <span className="gc-elo">{elo}</span>}
    </div>
  );

  return (
    <div className="game-card" onClick={onReview} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onReview()}>
      <div className="gc-left">
        <span className="gc-source"><SourceMark source={game.source} /></span>
        <TimeIcon kind={game.timeClass} />
      </div>

      <div className="gc-players">
        <Player name={game.white} elo={game.whiteElo} isFocus={whiteIsFocus} />
        <Player name={game.black} elo={game.blackElo} isFocus={blackIsFocus} />
      </div>

      <div className="gc-right">
        {game.userResult && <ResultBadge result={game.userResult} />}
        {game.opening && <span className="gc-opening" title={game.opening}>{game.opening}</span>}
        <span className="gc-review">Review →</span>
      </div>
    </div>
  );
}
