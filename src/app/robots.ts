import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isDemoInviteMode = process.env.DEMO_INVITE_MODE === "true";

  if (isDemoInviteMode) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app/"],
    },
    sitemap: "https://raseed.app/sitemap.xml",
  };
}
