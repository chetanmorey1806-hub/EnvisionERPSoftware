import React, { createContext, useCallback, useEffect, useState } from 'react';

export const ThemeContext = createContext(null);

/**
 * Colour mode — 'light' (the default), 'dark', or 'system' (follow the device),
 * the same three states as the bk-steels portal.
 *
 * `theme` is what the person chose; `resolved` is what is actually painted.
 * Everything that only needs to know "is it dark right now" reads `resolved`,
 * so choosing Device never breaks a light/dark check.
 *
 * index.html paints the saved mode before React loads, so there is no white
 * flash; this provider keeps it in step afterwards.
 */
const KEY = 'erp-theme';
const MODES = ['light', 'dark', 'system'];

const media = () =>
  (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);
const resolve = (theme) => (theme === 'system' ? (media()?.matches ? 'dark' : 'light') : theme === 'dark' ? 'dark' : 'light');

const readSaved = () => {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readSaved);
  const [resolved, setResolved] = useState(() => resolve(readSaved()));

  useEffect(() => {
    const paint = () => {
      const r = resolve(theme);
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
    };
    paint();
    try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }

    // Following the device: repaint the moment the OS switches (e.g. at sunset).
    if (theme !== 'system') return undefined;
    const mq = media();
    mq?.addEventListener?.('change', paint);
    return () => mq?.removeEventListener?.('change', paint);
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(MODES.includes(next) ? next : 'light'), []);

  // The header's sun/moon flips what you SEE, so from Device it picks the
  // opposite of the current paint and becomes an explicit choice.
  const toggleTheme = useCallback(() => setThemeState(resolve(theme) === 'dark' ? 'light' : 'dark'), [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
