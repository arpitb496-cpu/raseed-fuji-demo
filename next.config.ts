import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "pdfkit",
    "@sparticuz/chromium",
    "playwright-core",
  ],
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  turbopack: {
    resolveAlias: {
      "@coinbase/cdp-sdk": "./src/lib/mocks/empty.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
    };
    return config;
  },
};

export default nextConfig;
