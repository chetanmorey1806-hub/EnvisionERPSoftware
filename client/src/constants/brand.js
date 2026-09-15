/**
 * Brand colour derivation.
 *
 * The Switcher can repaint the app in any colour. Rather than storing nine
 * hand-picked values per choice, the whole brand ramp is derived from one hex —
 * and derived differently per colour mode, because a tint that reads as "light
 * brand" on a white page glows on a dark one.
 *
 * The shipped red is described by hand in index.css for both modes, so for that
 * one value the inline overrides are REMOVED rather than recomputed, and the
 * stylesheet keeps its own tuned palette.
 */

export const BRAND_RED = '#fb0404';

const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** `amount` 0 → all `a`, 1 → all `b`. */
const mix = (a, b, amount) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const t = (x, y) => hex2(x + (y - x) * amount);
  return `#${t(r1, r2)}${t(g1, g2)}${t(b1, b2)}`;
};
const rgba = (hex, alpha) => `rgba(${rgb(hex).join(', ')}, ${alpha})`;

const VARS = [
  '--brand-accent', '--brand-solid', '--brand-solid-hi', '--brand-mid', '--brand-to',
  '--brand-from', '--brand-light', '--brand-ring', '--brand-focus-ring',
];

/** Paint the brand variables for `primary`. Safe to call as often as you like. */
export function applyPrimary(primary) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!primary || primary.toLowerCase() === BRAND_RED) {
    VARS.forEach((v) => root.style.removeProperty(v));
    return;
  }

  const dark = root.classList.contains('dark');
  const ground = dark ? '#101318' : '#ffffff';
  const set = (v, value) => root.style.setProperty(v, value);

  set('--brand-accent', dark ? mix(primary, '#ffffff', 0.28) : primary);
  set('--brand-solid', primary);
  set('--brand-solid-hi', mix(primary, '#ffffff', 0.16));
  set('--brand-mid', dark ? mix(primary, '#000000', 0.3) : primary);
  set('--brand-to', dark ? mix(primary, '#000000', 0.12) : mix(primary, '#ffffff', 0.24));
  set('--brand-from', mix(primary, '#000000', dark ? 0.86 : 0.72));
  set('--brand-light', mix(primary, ground, dark ? 0.84 : 0.9));
  set('--brand-ring', mix(primary, ground, dark ? 0.62 : 0.6));
  set('--brand-focus-ring', rgba(primary, dark ? 0.24 : 0.16));
}

export default { BRAND_RED, applyPrimary };
