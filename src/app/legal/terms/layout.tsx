import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service (Demo Notice) | Raseed (रसीद)",
  description: "Terms of service and testnet demo notices for Raseed evaluation on Avalanche Fuji.",
  alternates: {
    canonical: "/legal/terms",
  },
  openGraph: {
    title: "Terms of Service (Demo Notice) | Raseed (रसीद)",
    description: "Terms of service and testnet demo notices for Raseed evaluation on Avalanche Fuji.",
    url: "/legal/terms",
    siteName: "Raseed",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service (Demo Notice) | Raseed (रसीद)",
    description: "Terms of service and testnet demo notices for Raseed evaluation on Avalanche Fuji.",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
