import { useId } from 'react';

// Brand mark: a geometric burger (bun, lettuce, patty, base) cut in white from an ember-to-amber tile.
// Pure SVG so it stays crisp at every size and works as the favicon too.
export function LogoMark({ size = 40, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`logo ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 48 48" width={size} height={size} focusable="false">
        <defs>
          <linearGradient id={`${id}g`} x1="6" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffa25c" />
            <stop offset="0.55" stopColor="#f2542d" />
            <stop offset="1" stopColor="#b8301b" />
          </linearGradient>
          <radialGradient id={`${id}h`} cx="16" cy="6" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill={`url(#${id}g)`} />
        <rect width="48" height="48" rx="13" fill={`url(#${id}h)`} />
        {/* top bun with sesame cut-outs */}
        <path d="M11.5 22.6c0-6.3 5.6-10.6 12.5-10.6s12.5 4.3 12.5 10.6c0 .5-.4.9-.9.9H12.4a.9.9 0 01-.9-.9z" fill="#fff" />
        <g fill="#f2542d" opacity="0.85">
          <ellipse cx="19" cy="17.2" rx="1.3" ry="0.75" transform="rotate(-24 19 17.2)" />
          <ellipse cx="24.4" cy="15.6" rx="1.3" ry="0.75" />
          <ellipse cx="29.6" cy="17.4" rx="1.3" ry="0.75" transform="rotate(24 29.6 17.4)" />
        </g>
        {/* lettuce */}
        <path d="M11 26.2c1.9 0 1.9-1.6 3.8-1.6s1.9 1.6 3.8 1.6 1.9-1.6 3.8-1.6 1.9 1.6 3.8 1.6 1.9-1.6 3.8-1.6 1.9 1.6 3.8 1.6 1.9-1.6 3.2-1.6"
          fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
        {/* patty */}
        <rect x="11" y="28.4" width="26" height="4.4" rx="2.2" fill="#fff" opacity="0.72" />
        {/* bottom bun */}
        <path d="M11.5 34.4h25v.8a3.9 3.9 0 01-3.9 3.9H15.4a3.9 3.9 0 01-3.9-3.9z" fill="#fff" />
      </svg>
    </span>
  );
}

// Mark + wordmark lockup.
export default function Logo({ size = 42, sub = 'Analytics', className = '' }) {
  return (
    <div className={`brand ${className}`}>
      <LogoMark size={size} />
      <div className="lbl wordmark">
        <strong>Burger<em>Town</em></strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}
