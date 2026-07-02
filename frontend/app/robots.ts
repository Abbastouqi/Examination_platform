import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup", "/trial"],
      disallow: [
        "/admin",
        "/dashboard",
        "/chat",
        "/billing",
        "/api-keys",
        "/profile",
        "/history",
        "/attempts",
        "/tests",
        "/mcq",
        "/css",
        "/analytics",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
