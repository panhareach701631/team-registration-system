import React, { useState, useEffect, useCallback } from 'react';
import { LanguageContext } from './contexts';
import { translations } from '../i18n/translations';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('teamreg_language') || 'km';
    }
    return 'km';
  });

  const setLang = useCallback((newLang) => {
    if (newLang === 'km' || newLang === 'en') {
      setLangState(newLang);
      localStorage.setItem('teamreg_language', newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key) => translations[lang]?.[key] || translations['en']?.[key] || key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
