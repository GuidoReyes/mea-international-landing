# Task ID: 156

**Title:** Create SEO sitemap and robots.txt

**Status:** done

**Dependencies:** 154 ✓

**Priority:** medium

**Description:** Generate sitemap.ts and robots.ts for Next.js with all public routes and free lessons

**Details:**

Create app/sitemap.ts exporting default async function returning MetadataRoute.Sitemap array. Include: home /, /cursos, /planes, /clases-en-vivo, all 7 ruta pages /cursos/{slug}, all free lessons (esGratis=true) /cursos/{rutaSlug}/leccion/{leccionSlug}. Fetch rutas and free lessons from API. Set appropriate changeFrequency and priority. Create app/robots.ts exporting default function returning MetadataRoute.Robots with Allow: /, Sitemap reference. Add metadata (title, description) for all free lesson pages in lesson page component or generateMetadata.

**Test Strategy:**

Access /sitemap.xml and verify all routes listed, verify /robots.txt served correctly, check lesson metadata in page source, validate sitemap XML with online validator, test Google Search Console integration
