import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El backend ya está excluido en tsconfig.json ("exclude": ["backend"]),
  // así que no hace falta ignorar errores de tipos: si algo truena acá,
  // debe frenar el build y no llegar mudo a producción.

  images: {
    remotePatterns: [
      // Imágenes de vocabulario del LessonPlayer: generadas con IA (Gemini) y
      // cacheadas en Cloudflare R2 — mismo dominio que el audio de lecciones.
      { protocol: "https", hostname: "*.r2.dev" },
    ],
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://unpkg.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              // *.r2.dev: audios de lecciones (Piper TTS) servidos desde Cloudflare R2
              "media-src 'self' data: blob: https://*.spline.design https://*.r2.dev",
              "connect-src 'self' https://api.mea.edu.gt https://www.mea.edu.gt https://*.spline.design wss://*.spline.design https://unpkg.com https://www.gstatic.com",
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
      // El panel admin no usa Spline/unpkg/Turnstile: CSP mucho más estricta
      // (sin 'unsafe-eval' ni CDNs). Va después de "/:path*" porque en Next
      // la última entrada que coincide gana para la misma key.
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://api.mea.edu.gt http://localhost:4000",
              "font-src 'self' data:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
