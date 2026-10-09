"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

export type Language = "en" | "hi";

type NestedTranslations = Record<string, unknown>;

const translations: Record<Language, NestedTranslations> = { en, hi };

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (path) => path,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get("lang") as Language | null;
    const saved = (queryLang === "hi" || queryLang === "en")
      ? queryLang
      : (localStorage.getItem("raseed_lang") as Language | null);

    if (saved === "en" || saved === "hi") {
      document.documentElement.lang = saved;
      queueMicrotask(() => {
        setLangState(saved);
      });
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("raseed_lang", newLang);
    document.documentElement.lang = newLang;
  };

  const t = (path: string): string => {
    const keys = path.split(".");
    let current: unknown = translations[lang];

    for (const key of keys) {
      if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        // Fallback to English
        let fallback: unknown = translations.en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === "object" && fbKey in (fallback as Record<string, unknown>)) {
            fallback = (fallback as Record<string, unknown>)[fbKey];
          } else {
            return path;
          }
        }
        return typeof fallback === "string" ? fallback : path;
      }
    }

    return typeof current === "string" ? current : path;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
