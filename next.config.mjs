/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "no-store" }];
    return [
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
