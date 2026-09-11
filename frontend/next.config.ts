import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    urlImports: ['https://framer.com', 'https://framerusercontent.com'],
  },
};

export default nextConfig;
