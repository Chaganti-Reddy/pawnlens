// PawnLens mark: a knight inside a "lens" ring. Pure SVG, scales crisply.
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="PawnLens" role="img">
      <defs>
        <linearGradient id="pl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7dc96b" />
          <stop offset="1" stopColor="#26c2a3" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#pl-g)" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="3" />
      <text x="32" y="33" textAnchor="middle" dominantBaseline="central" fontSize="34" fill="#1c2b16" fontWeight="700">♞</text>
    </svg>
  );
}
