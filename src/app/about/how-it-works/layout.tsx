import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | Raseed (रसीद)",
  description: "Learn how non-custodial, peer-to-peer USDC invoicing operates on Avalanche Fuji testnet.",
  alternates: {
    canonical: "/about/how-it-works",
  },
  openGraph: {
    title: "How It Works | Raseed (रसीद)",
    description: "Learn how non-custodial, peer-to-peer USDC invoicing operates on Avalanche Fuji testnet.",
    url: "/about/how-it-works",
    siteName: "Raseed Protocol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "How It Works | Raseed (रसीद)",
    description: "Three-step non-custodial USDC invoicing flow on Avalanche Fuji testnet.",
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
