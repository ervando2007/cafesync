import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google account profile photos (session avatar after Google sign-in).
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
