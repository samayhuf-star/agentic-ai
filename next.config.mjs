/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/": ["./components/landing/body.html"],
    "/55-ai-agents": ["./components/landing/body.html"],
  },
};

export default nextConfig;
