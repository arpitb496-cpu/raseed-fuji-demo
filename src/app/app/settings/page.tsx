"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "@/lib/auth/useAuth";
import { Download, Trash2 } from "lucide-react";

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
  const { disconnect, disconnectAsync } = useDisconnect();
  const { logout } = useAuth();

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
      setStatusMessage({
        type: "success",
        text: locale === "hi" ? "प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।" : "Profile updated successfully.",
      });
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

  const walletAddr = address || profile?.walletAddress || "";
  const shortAddress = walletAddr ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}` : "";

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    try {
      if (disconnectAsync) {
        await disconnectAsync();
      } else {
        disconnect();
      }
    } catch (discErr) {
      console.error("Wallet disconnect error:", discErr);
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="max-w-[740px] mx-auto py-4 space-y-8">
      <div className="pb-4 border-b border-[#e5e5e5]">
        <div className="nyc-kicker mb-1.5">Account &amp; Privacy</div>
        <h1 className="text-3xl sm:text-4xl font-display font-medium tracking-[-0.04em] text-[#0a0a0a]">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-[#3a3a3a] mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-[14px] border text-sm ${
            statusMessage.type === "success"
              ? "bg-[#a4d4c5]/40 border-[#173f32]/30 text-[#173f32]"
              : "bg-[#fee2e2] border-[#fecaca] text-[#991b1b]"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <section className="bg-[#faf5e8] border border-[#e5e5e5] rounded-[24px] p-7">
            <div className="h-5 w-36 bg-[#ebe6d6] rounded-md animate-pulse mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="h-11 bg-[#f5f0e0] rounded-[12px] animate-pulse" />
              <div className="h-11 bg-[#f5f0e0] rounded-[12px] animate-pulse" />
              <div className="h-11 bg-[#f5f0e0] rounded-[12px] animate-pulse" />
              <div className="h-11 bg-[#f5f0e0] rounded-[12px] animate-pulse" />
            </div>
          </section>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Profile */}
          <section className="bg-[#faf5e8] border border-[#0a0a0a] rounded-[24px] p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-display font-medium text-[#0a0a0a] pb-2 border-b border-[#e5e5e5]">
              {t("settings.profileHeading")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {locale === "hi" ? "वॉलेट पता (केवल पठन)" : "Connected Wallet (Read-only)"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={address || profile?.walletAddress || ""}
                  className="clay-input font-mono !text-xs !bg-[#f5f0e0] !text-[#3a3a3a]"
                />
              </div>

              <div>
                <label htmlFor="settings-display-name" className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {t("settings.displayName")}
                </label>
                <input
                  id="settings-display-name"
                  type="text"
                  placeholder="e.g. Satoshi Nakamoto"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="clay-input"
                />
              </div>

              <div>
                <label htmlFor="settings-business-name" className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {t("settings.businessName")}
                </label>
                <input
                  id="settings-business-name"
                  type="text"
                  placeholder="e.g. Acme Studio LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="clay-input"
                />
              </div>

              <div>
                <label htmlFor="settings-country" className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {t("settings.country")}
                </label>
                <input
                  id="settings-country"
                  type="text"
                  placeholder="e.g. India, United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="clay-input"
                />
              </div>
            </div>
          </section>

          {/* Section: Currency & Language */}
          <section className="bg-[#f5f0e0] border border-[#e5e5e5] rounded-[24px] p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="text-xl font-display font-medium text-[#0a0a0a]">
                {t("settings.currencyHeading")}
              </h2>
              <p className="text-xs text-[#3a3a3a] mt-1">
                {t("settings.currencyDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-currency-select" className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {locale === "hi" ? "सांकेतिक मुद्रा (Indicative Display)" : "Indicative Reference Currency"}
                </label>
                <select
                  id="settings-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "USD" | "INR")}
                  className="clay-input cursor-pointer"
                >
                  <option value="USD">USD ($), indicative reference</option>
                  <option value="INR">INR (₹) - Indicative (1 USDC ≈ ₹85)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-language-select" className="block text-xs font-medium text-[#0a0a0a] mb-1.5">
                  {locale === "hi" ? "भाषा प्राथमिकता (Language Preference)" : "Interface Language"}
                </label>
                <select
                  id="settings-language-select"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "hi")}
                  className="clay-input cursor-pointer"
                >
                  <option value="en">English (US/Global)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Data Privacy & Export */}
          <section className="bg-[#faf5e8] border border-[#e5e5e5] rounded-[24px] p-6 sm:p-8 space-y-4">
            <div>
              <h2 className="text-xl font-display font-medium text-[#0a0a0a]">
                {t("settings.dataPrivacy")}
              </h2>
              <p className="text-xs text-[#3a3a3a] mt-1 leading-relaxed">
                {locale === "hi"
                  ? "आप किसी भी समय अपने सभी इनवॉइस, ऑडिट रिकॉर्ड और प्रोफ़ाइल डेटा का पूरा बैकअप डाउनलोड कर सकते हैं या व्यक्तिगत डेटा को अज्ञात कर ड्राफ्ट इनवॉइस हटा सकते हैं।"
                  : "Download a portable backup of your complete invoice history, audit logs, and account records, or anonymize your personal data and delete draft invoices."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                id="settings-export-data-btn"
                href="/api/merchant/export"
                download
                className="clay-btn-secondary"
              >
                <Download className="w-4 h-4 text-[#0a0a0a]" />
                <span>{t("settings.exportData")}</span>
              </a>

              <button
                id="settings-delete-data-btn"
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-[12px] border border-[#fecaca] bg-[#fee2e2] text-[#991b1b] text-sm font-medium cursor-pointer hover:bg-rose-100 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-[#991b1b]" />
                <span>{t("settings.deleteData")}</span>
              </button>
            </div>
          </section>

          {/* Action: Save Profile */}
          <div className="flex justify-end">
            <button
              id="settings-save-button"
              type="submit"
              disabled={isSaving}
              className="clay-btn-primary"
            >
              {isSaving ? t("settings.saving") : t("settings.saveProfile")}
            </button>
          </div>
        </form>
      )}

      {/* Section: Sign Out */}
      <div className="pt-4 pb-20 space-y-2">
        {shortAddress && (
          <div className="text-xs text-[#6a6a6a] font-mono">
            {shortAddress}
          </div>
        )}
        <button
          id="settings-sign-out-btn"
          type="button"
          onClick={handleSignOut}
          className="w-full h-12 min-h-[48px] bg-[#faf5e8] border border-[#e5e5e5] hover:border-[#991b1b] rounded-[14px] text-[#991b1b] text-sm font-medium cursor-pointer transition-colors"
        >
          {t("auth.signOut")}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#fffaf0] border border-[#0a0a0a] rounded-[24px] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-display font-medium text-[#991b1b]">
              ⚠️ {t("settings.deleteData")}
            </h3>
            <p className="text-xs text-[#3a3a3a] leading-relaxed">
              {t("settings.deleteConfirm")}
            </p>

            <div className="bg-[#fee2e2] border border-[#fecaca] rounded-[14px] p-4 text-xs text-[#0a0a0a] leading-relaxed space-y-1.5">
              {locale === "hi" ? (
                <>
                  <p className="font-semibold text-[#991b1b]">
                    चेतावनी (डेटा प्रतिधारण एवं गुमनामी):
                  </p>
                  <p>
                    व्यक्तिगत डेटा (नाम, संपर्क, व्यवसाय विवरण) स्थायी रूप से अज्ञात (anonymized) कर दिया जाएगा और ड्राफ्ट इनवॉइस हटा दिए जाएंगे। वित्तीय लेखांकन एवं कानूनी अनुपालन के लिए भुगतान किए गए रिकॉर्ड और लेनदेन इतिहास सुरक्षित रखे जाएंगे।
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#991b1b]">
                    Notice (Data Retention &amp; Anonymization):
                  </p>
                  <p>
                    Personal data (merchant name, client contacts, business info) will be permanently anonymized and draft invoices deleted. Settled payment events and invoice records are preserved for accounting and tax compliance.
                  </p>
                </>
              )}
            </div>

            <div>
              <label
                htmlFor="delete-confirm-input"
                className="block text-xs font-medium mb-1.5 text-[#0a0a0a]"
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
                className="clay-input"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmInput("");
                }}
                disabled={isDeleting}
                className="clay-btn-secondary"
              >
                {locale === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <button
                id="confirm-delete-data-btn"
                type="button"
                onClick={handleDeleteData}
                disabled={isDeleting || deleteConfirmInput.trim() !== "DELETE"}
                className="px-5 py-2.5 min-h-[44px] rounded-[12px] bg-[#ef4444] text-white text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting
                  ? locale === "hi"
                    ? "प्रक्रिया जारी है..."
                    : "Processing..."
                  : locale === "hi"
                  ? "डेटा अज्ञात करें और ड्राफ्ट हटाएं"
                  : "Anonymize Data & Delete Drafts"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
