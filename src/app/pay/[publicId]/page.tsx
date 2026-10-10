import type { Metadata } from "next";
import PayInvoiceClient from "./PayInvoiceClient";

export const metadata: Metadata = {
  title: "Pay Invoice | Raseed",
  description: "Secure non-custodial USDC invoice payment on Avalanche",
  robots: {
    index: false,
    follow: false,
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
