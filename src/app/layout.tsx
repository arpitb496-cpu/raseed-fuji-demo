import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { TestnetDemoBanner } from "@/components/common/TestnetDemoBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BRANDING } from "@/config/branding";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const isDemoInviteMode = process.env.DEMO_INVITE_MODE === "true";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: `${BRANDING.name} | Non-Custodial Stablecoin Invoicing`,
  description: BRANDING.description,
  keywords: ["USDC invoicing", "Avalanche Fuji", "non-custodial payments", "crypto invoices India", "stablecoin payment link"],
  authors: [{ name: "CryptoDao Contributors" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${BRANDING.name} | Non-Custodial Stablecoin Invoicing`,
    description: BRANDING.description,
    url: "/",
    siteName: "CryptoDao",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${BRANDING.name} | Non-Custodial Stablecoin Invoicing`,
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
    <html lang="en" className={bricolageGrotesque.variable} suppressHydrationWarning>
      <body className={`${bricolageGrotesque.className} min-h-screen flex flex-col bg-[#F2F4FB] text-[#161A3A] antialiased selection:bg-[#4338CA] selection:text-white`}>
        <I18nProvider>
          <TestnetDemoBanner />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
