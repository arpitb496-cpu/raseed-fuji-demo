"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAccount, useDisconnect } from "wagmi";

interface MerchantProfile {
  id: string;
  walletAddress: string;
  displayName: string | null;
  businessName: string | null;
  country: string | null;
  defaultCurrencyDisplay: "USD" | "INR";
  createdAt: string;
}

export default function MerchantSettingsPage() {
  const { t, locale, setLocale } = useLanguage();
  const router = useRouter();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/merchant/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.merchant) {
            setProfile(data.merchant);
            setDisplayName(data.merchant.displayName || "");
            setBusinessName(data.merchant.businessName || "");
            setCountry(data.merchant.country || "");
            setCurrency(data.merchant.defaultCurrencyDisplay || "USD");
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/merchant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          businessName: businessName.trim() || null,
          country: country.trim() || null,
          defaultCurrencyDisplay: currency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await res.json();
      setProfile(data.merchant);
      setStatusMessage({ type: "success", text: locale === "hi" ? "प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।" : "Profile updated successfully." });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating profile",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteData() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/merchant/profile", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete account data");
      }
      disconnect();
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting account data");
      setIsDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
          {t("settings.title")}
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.9375rem", marginTop: "0.25rem" }}>
          {t("settings.subtitle")}
        </p>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: 8,
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            background: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${statusMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: statusMessage.type === "success" ? "#10b981" : "#ef4444",
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ height: 160, background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", opacity: 0.5 }} />
          <div style={{ height: 120, background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", opacity: 0.5 }} />
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Section: Profile */}
          <section
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.75rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 1rem 0" }}>
              {t("settings.profileHeading")}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {locale === "hi" ? "वॉलेट पता (केवल पठन)" : "Connected Wallet (Read-only)"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={address || profile?.walletAddress || ""}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.03)",
                    color: "var(--muted-foreground)",
                    fontSize: "0.875rem",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label htmlFor="settings-display-name" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {t("settings.displayName")}
                </label>
                <input
                  id="settings-display-name"
                  type="text"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label htmlFor="settings-business-name" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {t("settings.businessName")}
                </label>
                <input
                  id="settings-business-name"
                  type="text"
                  placeholder="e.g. Acme Studio LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label htmlFor="settings-country" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {t("settings.country")}
                </label>
                <input
                  id="settings-country"
                  type="text"
                  placeholder="e.g. India, United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section: Currency & Language */}
          <section
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.75rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
              {t("settings.currencyHeading")}
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: "0 0 1.25rem 0" }}>
              {t("settings.currencyDesc")}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <div style={{ minWidth: 200, flex: 1 }}>
                <label htmlFor="settings-currency-select" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {locale === "hi" ? "सांकेतिक मुद्रा (Indicative Display)" : "Indicative Reference Currency"}
                </label>
                <select
                  id="settings-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "INR")}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="USD">USD ($) - Base Micro-USDC</option>
                  <option value="INR">INR (₹) - Indicative (1 USDC ≈ ₹85)</option>
                </select>
              </div>

              <div style={{ minWidth: 200, flex: 1 }}>
                <label htmlFor="settings-language-select" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--muted-foreground)", marginBottom: "0.375rem" }}>
                  {locale === "hi" ? "भाषा प्राथमिकता (Language Preference)" : "Interface Language"}
                </label>
                <select
                  id="settings-language-select"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "hi")}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="en">English (US/Global)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Action: Save Profile */}
          <div>
            <button
              id="settings-save-button"
              type="submit"
              disabled={isSaving}
              style={{
                padding: "0.75rem 1.75rem",
                borderRadius: 8,
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9375rem",
                border: "none",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? t("settings.saving") : t("settings.saveProfile")}
            </button>
          </div>

          {/* Section: Data Privacy & Export */}
          <section
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.75rem",
              marginTop: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
              {t("settings.dataPrivacy")}
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: "0 0 1.25rem 0" }}>
              {locale === "hi"
                ? "आप किसी भी समय अपने सभी इनवॉइस, ऑडिट रिकॉर्ड और प्रोफ़ाइल डेटा का पूरा बैकअप डाउनलोड कर सकते हैं या अपना खाता स्थायी रूप से हटा सकते हैं।"
                : "Download a portable backup of your complete invoice history, audit logs, and account records, or permanently delete your stored profile."}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <a
                id="settings-export-data-btn"
                href="/api/merchant/export"
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--foreground)",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <span>📥</span> {t("settings.exportData")}
              </a>

              <button
                id="settings-delete-data-btn"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  borderRadius: 8,
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span>🗑️</span> {t("settings.deleteData")}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "1.75rem",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem 0", color: "#ef4444", fontSize: "1.25rem" }}>
              ⚠️ {t("settings.deleteData")}
            </h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1rem" }}>
              {t("settings.deleteConfirm")}
            </p>

            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 8,
                padding: "0.875rem",
                marginBottom: "1.25rem",
                fontSize: "0.8125rem",
                color: "var(--foreground)",
                lineHeight: 1.5,
              }}
            >
              {locale === "hi" ? (
                <>
                  <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#ef4444" }}>
                    चेतावनी (डेटा प्रतिधारण एवं गुमनामी):
                  </p>
                  <p style={{ margin: 0 }}>
                    व्यक्तिगत डेटा (नाम, संपर्क, व्यवसाय विवरण) स्थायी रूप से अज्ञात (anonymized) कर दिया जाएगा और ड्राफ्ट इनवॉइस हटा दिए जाएंगे। वित्तीय लेखांकन एवं कानूनी अनुपालन के लिए भुगतान किए गए रिकॉर्ड और लेनदेन इतिहास सुरक्षित रखे जाएंगे।
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#ef4444" }}>
                    Notice (Data Retention &amp; Anonymization):
                  </p>
                  <p style={{ margin: 0 }}>
                    Personal data (merchant name, client contacts, business info) will be permanently anonymized and draft invoices deleted. Settled payment events and invoice records are preserved for accounting and tax compliance.
                  </p>
                </>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="delete-confirm-input"
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  marginBottom: "0.5rem",
                  color: "var(--foreground)",
                }}
              >
                {locale === "hi"
                  ? "पुष्टि करने के लिए नीचे DELETE टाइप करें:"
                  : "Type DELETE below to confirm:"}
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--input-bg, transparent)",
                  color: "var(--foreground)",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmInput("");
                }}
                disabled={isDeleting}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                {locale === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <button
                id="confirm-delete-data-btn"
                type="button"
                onClick={handleDeleteData}
                disabled={isDeleting || deleteConfirmInput.trim() !== "DELETE"}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: isDeleting || deleteConfirmInput.trim() !== "DELETE" ? "not-allowed" : "pointer",
                  opacity: isDeleting || deleteConfirmInput.trim() !== "DELETE" ? 0.5 : 1,
                }}
              >
                {isDeleting
                  ? locale === "hi"
                    ? "हटाया जा रहा है..."
                    : "Deleting..."
                  : locale === "hi"
                  ? "हां, सब कुछ हटाएं"
                  : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
