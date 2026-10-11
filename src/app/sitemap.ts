import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/config/url";

export default function sitemap(): MetadataRoute.Sitemap {
  const isDemoInviteMode = process.env.DEMO_INVITE_MODE === "true";

  // When DEMO_INVITE_MODE is active, omit all URLs so site is not indexed
  if (isDemoInviteMode) {
    return [];
  }

  const baseUrl = getAppBaseUrl();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about/how-it-works`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/risks`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
