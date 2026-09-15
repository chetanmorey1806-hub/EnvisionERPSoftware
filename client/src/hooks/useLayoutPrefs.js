import { useCallback, useEffect, useState } from 'react';
import { applyPrimary, BRAND_RED } from '../constants/brand';

/**
 * Layout preferences — everything the Switcher can change.
 *
 * Ported from bk-steels. One module-level store with subscribers, so the
 * Switcher, the header, the menus and the pages all read one value without a
 * provider wrapped around the tree.
 *
 * Every choice is stamped on <html> as a data attribute and the CSS in
 * index.css does the rest; only the pieces that genuinely need to know (which
 * shell to render) read the value in JS.
 *
 * Light/dark is NOT here — that already lives in ThemeContext, and the Switcher
 * drives it through that.
 */

const KEY = 'erp-layout';

export const DEFAULTS = {
  dir: 'ltr',              // ltr | rtl
  nav: 'vertical',         // vertical | horizontal
  menuStyle: 'click',      // click | hover | icon-click | icon-hover
  sidemenu: 'default',     // default | closed | icon-text | icon-overlay | detached | double
  pageStyle: 'regular',    // regular | classic | modern
  width: 'full',           // full | boxed
  menuPos: 'fixed',        // fixed | scrollable
  headerPos: 'fixed',      // fixed | scrollable
  loader: 'enable',        // enable | disable
  primary: BRAND_RED,      // any hex — the whole brand palette is derived from it
  headerSkin: 'gradient',  // gradient | light | dark | color
  menuSkin: 'light',       // light | dark | color | gradient
  bg: 'default',           // default | slate | navy | plum | forest
};

/** Attribute name on <html> for each preference. */
const ATTR = {
  dir: 'data-dir',
  nav: 'data-nav',
  menuStyle: 'data-menu-style',
  sidemenu: 'data-sidemenu',
  pageStyle: 'data-page-style',
  width: 'data-width',
  menuPos: 'data-menu-pos',
  headerPos: 'data-header-pos',
  loader: 'data-loader',
  headerSkin: 'data-header-skin',
  menuSkin: 'data-menu-skin',
  bg: 'data-bg',
};

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
};

let current = read();
const listeners = new Set();

/** DOM only — safe to call as often as you like. */
export function applyLayout(prefs) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(ATTR).forEach(([k, attr]) => root.setAttribute(attr, prefs[k]));
  // `dir` is a real HTML attribute, not a data one — CSS logical properties and
  // the browser's own bidi handling both key off it.
  root.setAttribute('dir', prefs.dir);
  applyPrimary(prefs.primary);
}

// Stamp once at module load, so the first paint already has the right shell.
applyLayout(current);

/*
 * Light and dark want different derivations of the brand colour, so the palette
 * is repainted whenever the colour mode flips. ThemeContext toggles `.dark` on
 * <html>; watching the class keeps this file independent of it.
 */
if (typeof MutationObserver === 'function') {
  new MutationObserver(() => applyPrimary(current.primary))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

export function useLayoutPrefs() {
  const [prefs, setPrefs] = useState(current);

  useEffect(() => {
    listeners.add(setPrefs);
    return () => listeners.delete(setPrefs);
  }, []);

  const set = useCallback((key, value) => {
    current = { ...current, [key]: value };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode */ }
    applyLayout(current);
    listeners.forEach((fn) => fn(current));
  }, []);

  const update = useCallback((patch) => {
    current = { ...current, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode */ }
    applyLayout(current);
    listeners.forEach((fn) => fn(current));
  }, []);

  const reset = useCallback(() => update({ ...DEFAULTS }), [update]);

  return { prefs, set, update, reset };
}

export default useLayoutPrefs;
