import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const isDemoInviteMode = process.env.DEMO_INVITE_MODE === "true";

  // When DEMO_INVITE_MODE is active, omit all URLs so site is not listed in sitemap
  if (isDemoInviteMode) {
    return [];
  }

  return [
    {
      url: "https://raseed.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://raseed.app/about/how-it-works",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://raseed.app/security",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
