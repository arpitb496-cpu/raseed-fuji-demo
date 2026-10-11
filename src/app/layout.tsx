import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { I18nProvider } from "@/lib/i18n";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BRANDING } from "@/config/branding";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const isDemoInviteMode = process.env.DEMO_INVITE_MODE === "true";

export const metadata: Metadata = {
  metadataBase: new URL("https://raseed.app"),
  title: `${BRANDING.name} (${BRANDING.devanagariName}) | Non-Custodial Stablecoin Invoicing`,
  description: BRANDING.description,
  keywords: ["USDC invoicing", "Avalanche Fuji", "non-custodial payments", "crypto invoices India", "stablecoin payment link"],
  authors: [{ name: "Raseed Protocol Contributors" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${BRANDING.name} (${BRANDING.devanagariName}) | Non-Custodial Stablecoin Invoicing`,
    description: BRANDING.description,
    url: "/",
    siteName: "Raseed Protocol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${BRANDING.name} (${BRANDING.devanagariName}) | Non-Custodial Stablecoin Invoicing`,
    description: BRANDING.description,
  },
  robots: isDemoInviteMode
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      }
    : {
        index: true,
        follow: true,
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#FBFBF9] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
        <Web3Provider>
          <I18nProvider>
            <NetworkBanner />
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </I18nProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
