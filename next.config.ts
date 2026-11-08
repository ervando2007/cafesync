import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Extra hostnames allowed to reach the dev server, e.g. the development VPS
  // behind Nginx: ALLOWED_DEV_ORIGINS=cafesync.andryboy.my.id (comma-separated).
  // Unset on the laptop, where the app is opened on localhost.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
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
