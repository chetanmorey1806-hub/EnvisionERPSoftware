import { useEffect, useRef, useState } from 'react';

/**
 * Persist a list screen's search / filter / page state — and its scroll
 * position — so they survive leaving the page and coming back.
 *
 * Without this, the common data-entry loop is punishing: filter to "Batch 3,
 * inactive", scroll to row 40, open a record, press Back — and land at the top
 * of an unfiltered list, having lost your place. Every record you maintain
 * costs that re-navigation again.
 *
 *   const [q, setQ] = useListState('students', { search: '', status: '', page: 1 });
 *   …
 *   setQ((s) => ({ ...s, search: v, page: 1 }));
 *
 * State lives in sessionStorage (one key per `pageKey`), so it is per-tab and
 * disappears when the browser closes — a filter is a temporary working context,
 * not a preference worth remembering for ever.
 */
export function useListState(pageKey, initial, opts = {}) {
  const { disabled = false, scrollKey } = opts;
  const stateKey = `erp-list:${pageKey}`;
  const scrollStateKey = `erp-list-scroll:${scrollKey || pageKey}`;

  // Held in a ref so a fresh object literal on each render can't reset state.
  const initialRef = useRef(initial);

  const [state, setState] = useState(() => {
    if (disabled) return initialRef.current;
    try {
      const raw = sessionStorage.getItem(stateKey);
      if (!raw) return initialRef.current;
      // Merged over the defaults, so a filter added in code later still gets
      // its default instead of coming back undefined from an old saved blob.
      return { ...initialRef.current, ...JSON.parse(raw) };
    } catch {
      return initialRef.current;
    }
  });

  useEffect(() => {
    if (disabled) return;
    try { sessionStorage.setItem(stateKey, JSON.stringify(state)); } catch { /* quota or private mode — not worth failing the page over */ }
  }, [state, stateKey, disabled]);

  /*
    Restore scroll after the rows have painted. A single rAF still runs before
    the list has height, so the jump lands at 0; two gets us past layout.
  */
  useEffect(() => {
    if (disabled) return undefined;
    const y = Number(sessionStorage.getItem(scrollStateKey) || 0);
    if (!y) return undefined;

    let cancelled = false;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (!cancelled) window.scrollTo(0, y);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [scrollStateKey, disabled]);

  /*
    Record scroll on the way out. The app scrolls its <main>, not the window,
    so both are checked — whichever is actually scrolled wins.
  */
  useEffect(() => {
    if (disabled) return undefined;
    const save = () => {
      const main = document.querySelector('main');
      const y = window.scrollY || main?.scrollTop || 0;
      try { sessionStorage.setItem(scrollStateKey, String(y)); } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', save);
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
    };
  }, [scrollStateKey, disabled]);

  /** Drop the saved context — for a "Clear all filters" button. */
  const reset = () => {
    setState(initialRef.current);
    try {
      sessionStorage.removeItem(stateKey);
      sessionStorage.removeItem(scrollStateKey);
    } catch { /* ignore */ }
  };

  return [state, setState, reset];
}

export default useListState;

/**
 * Drop-in replacement for `useState` that remembers the value per tab.
 *
 * Deliberately API-compatible with useState so a list page's existing
 * `const [search, setSearch] = useState('')` becomes persistent by changing one
 * line, instead of being restructured into a single state object.
 *
 *   const [search, setSearch] = usePersistedState('students:search', '');
 */
export function usePersistedState(key, initial) {
  const storageKey = `erp-filter:${key}`;

  const [value, setValue] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* ignore */ }
  }, [storageKey, value]);

  return [value, setValue];
}
