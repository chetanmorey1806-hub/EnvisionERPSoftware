import React, { useEffect, useRef, useState } from 'react';
import { useT } from '../../context/LanguageContext';
import { Icons } from '../common/icons';

/** English / मराठी / हिंदी switcher. The choice is remembered across sessions. */
const LanguageSwitcher = () => {
  const { lang, setLang, languages, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('Language')}
        title={t('Language')}
        className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg bg-gray-100 dark:bg-slate-800
                   text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition press"
      >
        <span className="text-[11px] font-black">{current.short}</span>
        <Icons.chevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 z-50 p-1 rounded-xl border border-gray-200 dark:border-slate-800
                        bg-white dark:bg-slate-900 shadow-xl animate-scale-up origin-top-right">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                l.code === lang
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {l.label}
              {l.code === lang && <Icons.check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
