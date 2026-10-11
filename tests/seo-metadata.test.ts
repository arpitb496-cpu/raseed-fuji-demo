import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as howItWorksMetadata } from "@/app/about/how-it-works/layout";
import { metadata as securityMetadata } from "@/app/security/layout";
import { metadata as termsMetadata } from "@/app/legal/terms/layout";
import { metadata as privacyMetadata } from "@/app/legal/privacy/layout";
import { metadata as risksMetadata } from "@/app/legal/risks/layout";
import { metadata as payMetadata } from "@/app/pay/[publicId]/page";

describe("SEO Metadata & Routing Standards", () => {
  const ROUTE_METADATA_MAP = [
    { route: "/", metadata: rootMetadata },
    { route: "/about/how-it-works", metadata: howItWorksMetadata },
    { route: "/security", metadata: securityMetadata },
    { route: "/legal/terms", metadata: termsMetadata },
    { route: "/legal/privacy", metadata: privacyMetadata },
    { route: "/legal/risks", metadata: risksMetadata },
    { route: "/pay/[publicId]", metadata: payMetadata },
  ];

  it("verifies every route has a unique, non-empty title and description", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const { route, metadata } of ROUTE_METADATA_MAP) {
      const title = String(metadata.title || "");
      const desc = String(metadata.description || "");

      expect(title.length, `Title must be non-empty for ${route}`).toBeGreaterThan(5);
      expect(desc.length, `Description must be non-empty for ${route}`).toBeGreaterThan(10);

      expect(titles.has(title), `Duplicate title detected for ${route}: "${title}"`).toBe(false);
      expect(descriptions.has(desc), `Duplicate description detected for ${route}: "${desc}"`).toBe(false);

      titles.add(title);
      descriptions.add(desc);
    }
  });

  it("verifies canonical tag is configured on public routes", () => {
    const publicRoutes = ROUTE_METADATA_MAP.filter((r) => r.route !== "/pay/[publicId]");
    for (const { route, metadata } of publicRoutes) {
      expect(metadata.alternates, `Canonical alternates missing for ${route}`).toBeDefined();
      const canonical = metadata.alternates?.canonical;
      expect(canonical, `Canonical URL missing for ${route}`).toBeDefined();
      expect(String(canonical).length).toBeGreaterThan(0);
    }
  });

  it("verifies Open Graph and Twitter tags are text-only (no external images)", () => {
    for (const { route, metadata } of ROUTE_METADATA_MAP) {
      expect(metadata.openGraph, `Open Graph metadata missing for ${route}`).toBeDefined();
      expect(metadata.twitter, `Twitter metadata missing for ${route}`).toBeDefined();

      // Verify text-only: images should not reference external tracker URLs
      const ogImages = (metadata.openGraph as Record<string, unknown>)?.images;
      const twImages = (metadata.twitter as Record<string, unknown>)?.images;

      expect(ogImages, `OG images must be undefined (text-only) for ${route}`).toBeUndefined();
      expect(twImages, `Twitter images must be undefined (text-only) for ${route}`).toBeUndefined();
    }
  });

  describe("robots.txt behavior against DEMO_INVITE_MODE", () => {
    it("disallows all crawling when DEMO_INVITE_MODE=true", () => {
      const prev = process.env.DEMO_INVITE_MODE;
      try {
        process.env.DEMO_INVITE_MODE = "true";
        const result = robots();
        expect(result.rules).toEqual({
          userAgent: "*",
          disallow: "/",
        });
      } finally {
        if (prev !== undefined) process.env.DEMO_INVITE_MODE = prev;
        else delete process.env.DEMO_INVITE_MODE;
      }
    });

    it("allows indexing of public pages and protects private routes when DEMO_INVITE_MODE=false", () => {
      const prev = process.env.DEMO_INVITE_MODE;
      try {
        process.env.DEMO_INVITE_MODE = "false";
        const result = robots();
        expect(Array.isArray(result.rules)).toBe(false);
        const rules = result.rules as { userAgent: string; allow: string; disallow: string[] };
        expect(rules.userAgent).toBe("*");
        expect(rules.allow).toBe("/");
        expect(rules.disallow).toContain("/api/");
        expect(rules.disallow).toContain("/app/");
        expect(rules.disallow).toContain("/pay/");
      } finally {
        if (prev !== undefined) process.env.DEMO_INVITE_MODE = prev;
        else delete process.env.DEMO_INVITE_MODE;
      }
    });
  });

  describe("sitemap.xml behavior against DEMO_INVITE_MODE", () => {
    it("returns an empty sitemap when DEMO_INVITE_MODE=true", () => {
      const prev = process.env.DEMO_INVITE_MODE;
      try {
        process.env.DEMO_INVITE_MODE = "true";
        const entries = sitemap();
        expect(entries).toEqual([]);
      } finally {
        if (prev !== undefined) process.env.DEMO_INVITE_MODE = prev;
        else delete process.env.DEMO_INVITE_MODE;
      }
    });

    it("returns public routes when DEMO_INVITE_MODE=false", () => {
      const prev = process.env.DEMO_INVITE_MODE;
      try {
        process.env.DEMO_INVITE_MODE = "false";
        const entries = sitemap();
        expect(entries.length).toBeGreaterThanOrEqual(6);
        const urls = entries.map((e) => e.url);
        expect(urls.some((u) => u.endsWith("/about/how-it-works"))).toBe(true);
        expect(urls.some((u) => u.endsWith("/security"))).toBe(true);
        expect(urls.some((u) => u.endsWith("/legal/terms"))).toBe(true);
      } finally {
        if (prev !== undefined) process.env.DEMO_INVITE_MODE = prev;
        else delete process.env.DEMO_INVITE_MODE;
      }
    });
  });
});
