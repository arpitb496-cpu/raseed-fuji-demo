"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-0.5 text-xs font-medium">
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer ${
          lang === "en"
            ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-semibold shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLang("hi")}
        className={`px-2 py-1 rounded transition-colors cursor-pointer font-serif ${
          lang === "hi"
            ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 font-semibold shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
        }`}
        aria-label="हिन्दी में बदलें"
      >
        हिन्दी
      </button>
    </div>
  );
}
