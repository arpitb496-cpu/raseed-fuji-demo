import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk Disclosures (Demo Notice) | Raseed (रसीद)",
  description: "Self-custody, smart contract, and testnet risk disclosures for Raseed evaluation on Avalanche Fuji.",
  alternates: {
    canonical: "/legal/risks",
  },
  openGraph: {
    title: "Risk Disclosures (Demo Notice) | Raseed (रसीद)",
    description: "Self-custody, smart contract, and testnet risk disclosures for Raseed evaluation on Avalanche Fuji.",
    url: "/legal/risks",
    siteName: "Raseed",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Risk Disclosures (Demo Notice) | Raseed (रसीद)",
    description: "Self-custody and testnet risk disclosures for Raseed evaluation on Avalanche Fuji.",
  },
};

export default function RisksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
