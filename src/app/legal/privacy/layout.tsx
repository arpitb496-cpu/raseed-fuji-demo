import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy (Demo Notice) | CryptoDao",
  description: "Data minimization policy and public on-chain ledger transparency for CryptoDao testnet demo.",
  alternates: {
    canonical: "/legal/privacy",
  },
  openGraph: {
    title: "Privacy Policy (Demo Notice) | CryptoDao",
    description: "Data minimization policy and public on-chain ledger transparency for CryptoDao testnet demo.",
    url: "/legal/privacy",
    siteName: "CryptoDao",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy (Demo Notice) | CryptoDao",
    description: "Data minimization policy and transparency disclosures for CryptoDao testnet demo.",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
