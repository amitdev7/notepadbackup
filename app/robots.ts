import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://zenithsui.sh"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/lan/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
