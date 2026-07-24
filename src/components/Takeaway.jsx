import { FaLightbulb } from '../ui/icons.js';
import { gameTakeaway } from '../lib/lessons.js';

// The single most useful sentence about this game.
export default function Takeaway({ analysis, focusColor }) {
  const text = gameTakeaway(analysis, focusColor);
  return (
    <div className="takeaway">
      <FaLightbulb className="takeaway-icon" />
      <span>{text}</span>
    </div>
  );
}
