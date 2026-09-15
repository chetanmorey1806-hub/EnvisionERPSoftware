import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './icons';
import { usePermissions } from '../../hooks/usePermissions';
import { useT } from '../../context/LanguageContext';
import { visibleSections, visibleTopLinks } from '../../config/menuSections';

/**
 * Command palette — ⌘K / Ctrl-K to jump anywhere.
 *
 * With six collapsible sections over thirty-odd screens, "where is Student
 * Readiness again?" costs two clicks and a scan every time. Typing three
 * letters is faster than remembering which group a module was filed under,
 * which matters most to the people who live in this app all day.
 *
 * Destinations come from the same registry that builds the menu and the routes,
 * filtered by the signed-in user's permissions — so the palette can never offer
 * a screen the account would be bounced out of.
 */

const RECENTS_KEY = 'erp-palette-recents';
const MAX_RECENTS = 5;

/** Subsequence match: "stred" finds "Student Readiness". */
const score = (needle, haystack) => {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (!n) return 0;
  const direct = h.indexOf(n);
  if (direct === 0) return 1000;          // prefix — the strongest signal
  if (direct > 0) return 500 - direct;    // contained, earlier is better

  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i += 1;
    if (i === n.length) return 100;       // all letters in order, scattered
  }
  return -1;                              // no match
};

const CommandPalette = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { t } = useT();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  /** Every destination this account may actually reach. */
  const destinations = useMemo(() => {
    const out = visibleTopLinks(can).map((l) => ({
      name: l.name, path: l.path, icon: l.icon, group: 'Workspace',
    }));
    visibleSections(can).forEach((s) => {
      s.items.forEach((i) => out.push({ name: i.name, path: i.path, icon: i.icon, group: s.label }));
    });
    out.push({ name: 'My Profile', path: '/profile', icon: Icons.staff, group: 'Account' });
    return out;
  }, [can]);

  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
  });

  /* Open on ⌘K / Ctrl-K from anywhere except while typing in a field. */
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key?.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* A custom event lets the topbar button open it without prop-drilling. */
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('erp:open-palette', onOpen);
    return () => window.removeEventListener('erp:open-palette', onOpen);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return; }
    // Autofocus has to wait for the element to exist.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const recentSet = recents
        .map((p) => destinations.find((d) => d.path === p))
        .filter(Boolean);
      // No query: recents first, then everything, without repeating a recent.
      return [...recentSet, ...destinations.filter((d) => !recents.includes(d.path))];
    }
    return destinations
      .map((d) => ({ d, s: Math.max(score(query, d.name), score(query, d.group) - 200) }))
      .filter((x) => x.s > -1)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.d);
  }, [query, destinations, recents]);

  useEffect(() => { setCursor(0); }, [query]);

  const go = useCallback((dest) => {
    if (!dest) return;
    const next = [dest.path, ...recents.filter((p) => p !== dest.path)].slice(0, MAX_RECENTS);
    setRecents(next);
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setOpen(false);
    navigate(dest.path);
  }, [navigate, recents]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]); }
  };

  /* Keep the highlighted row inside the scroll viewport. */
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const showingRecents = !query.trim() && recents.length > 0;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in" onClick={() => setOpen(false)} />

      <div className="relative z-10 w-full max-w-xl erp-card shadow-2xl overflow-hidden animate-scale-up">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <Icons.search size={17} className="text-gray-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('Jump to a screen…')}
            aria-label={t('Jump to a screen')}
            className="flex-1 bg-transparent border-0 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-0 p-0"
          />
          <kbd className="hidden sm:inline text-[10px] font-mono font-bold text-gray-400 border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-gray-400">
              {t('Nothing matches')} “{query}”
            </p>
          ) : (
            results.map((d, i) => {
              const isRecent = showingRecents && i < recents.length;
              const prev = results[i - 1];
              const showHeading = !query.trim() && !isRecent
                && (i === 0 || (showingRecents && i === recents.length) || prev?.group !== d.group);

              return (
                <React.Fragment key={`${d.path}-${i}`}>
                  {showingRecents && i === 0 && (
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t('Recent')}
                    </p>
                  )}
                  {showHeading && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {t(d.group)}
                    </p>
                  )}
                  <button
                    data-active={i === cursor}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(d)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      i === cursor
                        ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-800 dark:text-brand-200'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <d.icon size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="flex-1 text-sm font-medium truncate">{t(d.name)}</span>
                    {isRecent && <Icons.clock size={13} className="text-gray-300 shrink-0" aria-hidden="true" />}
                    <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">{t(d.group)}</span>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 flex items-center gap-4 text-[10px] text-gray-400">
          <span>↑↓ {t('navigate')}</span>
          <span>↵ {t('open')}</span>
          <span className="ml-auto font-mono">⌘K / Ctrl-K</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
