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
        background: "#FFFFFF",
        borderRadius: 999,
        padding: 3,
        boxShadow: "0 2px 8px rgba(40,50,120,0.08)",
        border: "none",
      }}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        style={{
          minHeight: 44,
          minWidth: 44,
          padding: "0 8px",
          borderRadius: 999,
          border: "none",
          background: lang === "en" ? "#4338CA" : "transparent",
          color: lang === "en" ? "#FFFFFF" : "#5B6190",
          fontWeight: lang === "en" ? 700 : 500,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
        aria-label="EN - Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        style={{
          minHeight: 44,
          minWidth: 44,
          padding: "0 8px",
          borderRadius: 999,
          border: "none",
          background: lang === "hi" ? "#4338CA" : "transparent",
          color: lang === "hi" ? "#FFFFFF" : "#5B6190",
          fontWeight: lang === "hi" ? 700 : 500,
          fontSize: 13,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
        aria-label="हिन्दी - Switch to Hindi"
      >
        हिन्दी
      </button>
    </div>
  );
}
