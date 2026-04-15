import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: {
    // Allow large xlsx uploads (5 files × up to 5 MB each)
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
