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
    ];
  },
  outputFileTracingIncludes: {
    "/": ["./components/landing/body.html"],
    "/55-ai-agents": ["./components/landing/body.html"],
  },
};

export default nextConfig;
