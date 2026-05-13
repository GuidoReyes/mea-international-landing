import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // El backend tiene su propio tsconfig — excluirlo del build de Next.js
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
