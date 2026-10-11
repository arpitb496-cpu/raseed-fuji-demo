import type { Metadata } from "next";
import PayInvoiceClient from "./PayInvoiceClient";

export const metadata: Metadata = {
  title: "Pay Invoice | Raseed (रसीद)",
  description: "Non-custodial USDC invoice payment settlement directly on Avalanche Fuji testnet.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: "Pay Invoice | Raseed (रसीद)",
    description: "Non-custodial USDC invoice payment settlement on Avalanche Fuji testnet.",
    siteName: "Raseed",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pay Invoice | Raseed (रसीद)",
    description: "Non-custodial USDC invoice settlement on Avalanche Fuji testnet.",
  },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <PayInvoiceClient publicId={publicId} />;
}
