// Central Branding Configuration

export const BRANDING = {
  name: "Raseed",
  devanagariName: "रसीद",
  tagline: "Direct, non-custodial stablecoin payments on Avalanche.",
  description: "Peer-to-peer USDC invoicing and payment links. No custody, zero intermediary lockup, verifiable on Snowtrace.",
  domain: "raseed.fi",
  supportEmail: "support@raseed.fi",
  securityEmail: "security@raseed.fi",
  githubUrl: "https://github.com/raseed-protocol/raseed",
  docsUrl: "/about/how-it-works",
  securityUrl: "/security",
  termsUrl: "/legal/terms",
  privacyUrl: "/legal/privacy",
} as const;

export type BrandingConfig = typeof BRANDING;
