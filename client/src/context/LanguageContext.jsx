import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, LANGUAGES } from '../i18n/translations';

const STORAGE_KEY = 'erp-lang';

export const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (s) => s,
  languages: LANGUAGES,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Helps screen readers and font shaping pick the right language.
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Translate. The key IS the English string, so an untranslated string simply
   * renders as readable English — never a blank or a raw key.
   */
  const t = useCallback(
    (text) => {
      if (lang === 'en' || !text) return text;
      return translations[lang]?.[text] ?? text;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/** const { t, lang, setLang } = useT(); */
export const useT = () => useContext(LanguageContext);

export default LanguageProvider;
