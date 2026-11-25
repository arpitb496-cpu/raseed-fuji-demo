"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "#f5f0e0",
        borderRadius: 999,
        padding: 3,
        border: "1px solid #e5e5e5",
      }}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        style={{
          minHeight: 38,
          minWidth: 42,
          padding: "0 10px",
          borderRadius: 999,
          border: "none",
          background: lang === "en" ? "#0a0a0a" : "transparent",
          color: lang === "en" ? "#fffaf0" : "#3a3a3a",
          fontWeight: lang === "en" ? 500 : 400,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s ease",
        }}
        aria-label="EN - Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        style={{
          minHeight: 38,
          minWidth: 46,
          padding: "0 10px",
          borderRadius: 999,
          border: "none",
          background: lang === "hi" ? "#0a0a0a" : "transparent",
          color: lang === "hi" ? "#fffaf0" : "#3a3a3a",
          fontWeight: lang === "hi" ? 500 : 400,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s ease",
        }}
        aria-label="हिन्दी - Switch to Hindi"
      >
        हिन्दी
      </button>
    </div>
  );
}
