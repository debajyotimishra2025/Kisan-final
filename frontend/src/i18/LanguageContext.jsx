import React, { createContext, useContext, useMemo, useState } from "react";
import translations from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem("kisan_language") || "en"
  );

  const setLanguage = (lang) => {
    if (!translations[lang]) return;

    localStorage.setItem("kisan_language", lang);
    setLanguageState(lang);
  };

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    // Fallback to English if translation doesn't exist
    if (value === undefined) {
      value = translations.en;

      for (const k of keys) {
        value = value?.[k];
      }
    }

    return value || key;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}