import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Architecture | Raseed (रसीद)",
  description: "Non-custodial architecture, zero fund custody, and stateless routing on Avalanche Fuji testnet.",
  alternates: {
    canonical: "/security",
  },
  openGraph: {
    title: "Security Architecture | Raseed (रसीद)",
    description: "Non-custodial architecture, zero fund custody, and stateless routing on Avalanche Fuji testnet.",
    url: "/security",
    siteName: "Raseed",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Security Architecture | Raseed (रसीद)",
    description: "Non-custodial architecture and technical principles on Avalanche Fuji testnet.",
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
