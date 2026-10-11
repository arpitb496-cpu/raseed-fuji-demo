import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/config/url";

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
      disallow: ["/api/", "/app/", "/pay/"],
    },
    sitemap: `${getAppBaseUrl()}/sitemap.xml`,
  };
}
