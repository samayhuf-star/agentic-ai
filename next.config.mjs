/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    const security = [
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/onboarding", headers: noStore },
      { source: "/dashboard/:path*", headers: noStore },
      { source: "/api/auth/:path*", headers: noStore },
      { source: "/api/onboarding", headers: noStore },
      {
        source: "/partner/:path*",
        headers: [...noStore, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }],
      },
      { source: "/api/partner/:path*", headers: noStore },
      { source: "/api/partners/:path*", headers: noStore },
    ];
  },
  outputFileTracingIncludes: {
    "/": ["./components/landing/body.html", "./content/blog/**/*"],
    "/55-ai-agents": ["./components/landing/body.html"],
    "/blog": ["./content/blog/**/*"],
    "/blog/[slug]": ["./content/blog/**/*"],
  },
};

export default nextConfig;
