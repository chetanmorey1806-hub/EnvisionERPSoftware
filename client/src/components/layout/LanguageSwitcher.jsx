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
        className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-gray-500 dark:text-slate-400
                   hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-100 transition press"
      >
        <span className="text-[11px] font-black">{current.short}</span>
        <Icons.chevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 z-50 p-1 erp-card shadow-xl animate-scale-up origin-top-right">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                l.code === lang
                  ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold'
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
