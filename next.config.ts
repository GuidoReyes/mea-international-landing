import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // El backend tiene su propio tsconfig — excluirlo del build de Next.js
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.mea.edu.gt https://www.mea.edu.gt https://*.spline.design wss://*.spline.design",
              "frame-src https://challenges.cloudflare.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
