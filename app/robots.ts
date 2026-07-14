import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/mis-cursos", "/checkout", "/verify", "/verify-online"],
      },
    ],
    sitemap: "https://www.mea.edu.gt/sitemap.xml",
  };
}
