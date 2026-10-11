import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy (Demo Notice) | Raseed (रसीद)",
  description: "Data minimization policy and public on-chain ledger transparency for Raseed testnet demo.",
  alternates: {
    canonical: "/legal/privacy",
  },
  openGraph: {
    title: "Privacy Policy (Demo Notice) | Raseed (रसीद)",
    description: "Data minimization policy and public on-chain ledger transparency for Raseed testnet demo.",
    url: "/legal/privacy",
    siteName: "Raseed Protocol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy (Demo Notice) | Raseed (रसीद)",
    description: "Data minimization policy and transparency disclosures for Raseed testnet demo.",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
