import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getPending, subscribePending } from '../hooks.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fades + lifts its children into view the first time they scroll on screen.
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setShown(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms` }}>{children}</div>;
}

// Thin gradient bar fixed to the top of the viewport while any data request is in flight.
export function TopProgress() {
  const n = useSyncExternalStore(subscribePending, getPending);
  return <div className={`topprogress ${n > 0 ? 'on' : ''}`} role="progressbar" aria-hidden={n === 0} aria-label="Loading"><i /></div>;
}

// Cursor-follow spotlight: spread onto a `.spot` element.
export const spot = {
  onMouseMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
};

// Animates a number towards its target (ease-out); always lands on the exact value, even if frames are throttled.
export function useCountUp(target, ms = 700) {
  const [v, setV] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(target); from.current = target; return undefined; }
    const start = performance.now();
    const a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      setV(a + (target - a) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = setTimeout(() => setV(target), ms + 80);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); from.current = target; };
  }, [target, ms]);
  return v;
}

export function CountUp({ value, format = (x) => x, ms }) {
  return <>{format(useCountUp(value, ms))}</>;
}
