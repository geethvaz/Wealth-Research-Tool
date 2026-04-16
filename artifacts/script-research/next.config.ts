import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  experimental: {
    // Allow large xlsx uploads (5 files × up to 5 MB each)
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  // Next.js needs to know the app is inside src/
  distDir: ".next",
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};

export default nextConfig;
