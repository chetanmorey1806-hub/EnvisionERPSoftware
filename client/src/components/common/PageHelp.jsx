import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Modal from './Modal';
import { Icons } from './icons';
import { helpFor } from '../../config/pageHelp';
import { useT } from '../../context/LanguageContext';

/**
 * "How to use this page" — a help button rendered once by MainLayout, so every
 * route gets it automatically and none can be forgotten.
 *
 * Content is resolved from the route (longest-prefix) and shown in the app's
 * current language (English / मराठी / हिंदी). Switching language inside the
 * modal switches the whole app, so there is only ever one language setting.
 */
const PageHelp = () => {
  const { pathname } = useLocation();
  const { lang, setLang, languages, t } = useT();
  const [open, setOpen] = useState(false);

  const entry = helpFor(pathname);
  if (!entry) return null;

  const h = entry[lang] || entry.en;
  const label = t('How to use this page');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wide
                   bg-brand-50 text-brand-700 hover:bg-brand-100
                   dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25
                   border border-brand-100 dark:border-brand-900/60 transition press"
        title={label}
      >
        <Icons.help size={14} aria-hidden="true" />
        <span className="hidden lg:inline">{t('How to use')}</span>
      </button>

      {open && (
        <Modal isOpen size="xl" title={h.title} onClose={() => setOpen(false)}
          footer={
            <button onClick={() => setOpen(false)}
              className="erp-btn-primary px-4 py-2.5 text-xs">
              {t('Got it')}
            </button>
          }>
          <div className="space-y-5">
            {/* Language toggle — changes the whole app, not just this panel. */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 w-fit">
              {languages.map((o) => (
                <button key={o.code} onClick={() => setLang(o.code)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${
                    lang === o.code
                      ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* Purpose */}
            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{h.purpose}</p>

            {/* Steps */}
            {h.steps?.length > 0 && (
              <section>
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  <Icons.check size={13} /> {t('How to use it')}
                </h3>
                <ol className="space-y-2">
                  {h.steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                      <span className="shrink-0 grid place-items-center h-5 w-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-[10px] font-black">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* How to fill & submit — the bit people actually ask about */}
            {h.submit && (
              <section className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
                  <Icons.upload size={13} /> {t('How to fill & submit')}
                </h3>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed whitespace-pre-line">
                  {h.submit}
                </p>
              </section>
            )}

            {/* Tips */}
            {h.tips?.length > 0 && (
              <section>
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-2">
                  <Icons.warning size={13} /> {t('Good to know')}
                </h3>
                <ul className="space-y-1.5">
                  {h.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      <span className="text-amber-500 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default PageHelp;
