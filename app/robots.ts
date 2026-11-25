import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/sup-admin", "/admin", "/api/", "/onboarding", "/checkout/", "/payment/", "/welcome", "/unsubscribe", "/partner/", "/r/"] }],
    sitemap: "https://www.theaitimemachine.com/sitemap.xml",
  };
}
