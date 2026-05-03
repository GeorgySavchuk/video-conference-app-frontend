import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  /** В Docker без отдельного image-worker sharp сильно грузит CPU на /_next/image */
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: "/meeting/:path*",
        destination: "/room/:path*",
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_SIGNALING_URL: process.env.NEXT_PUBLIC_SIGNALING_URL,
  },
};

export default nextConfig;