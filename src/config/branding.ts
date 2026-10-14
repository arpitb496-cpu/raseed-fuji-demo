// Central Branding Configuration

export const BRANDING = {
  name: "CryptoDao",
  devanagariName: "",
  tagline: "Direct, non-custodial stablecoin payments on Avalanche.",
  description: "Peer-to-peer USDC invoicing and payment links. No custody, zero intermediary lockup.",
  domain: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "localhost:3000",
  supportEmail: process.env.SUPPORT_CONTACT_EMAIL || "",
  securityEmail: process.env.SECURITY_CONTACT_EMAIL || "",
  githubUrl: "https://github.com/raseed-protocol/raseed",
  docsUrl: "/about/how-it-works",
  securityUrl: "/security",
  termsUrl: "/legal/terms",
  privacyUrl: "/legal/privacy",
} as const;

export type BrandingConfig = typeof BRANDING;
