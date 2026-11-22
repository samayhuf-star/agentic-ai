/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/": ["./components/landing/body.html"],
  },
};

export default nextConfig;
