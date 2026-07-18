# Task ID: 48

**Title:** Create public /verify/[codigo] certificate validation page

**Status:** done

**Dependencies:** 47 ✓

**Priority:** low

**Description:** Build public-facing certificate verification page with SEO markup

**Details:**

Create app/verify/[codigo]/page.tsx as server component (no 'use client'). In page function, fetch /api/certificados/verify/:codigo server-side. If valid: display card with green badge 'Certificado Válido', show alumno nombre, curso nombre, fecha emisión formatted. If invalid: red badge 'Certificado no encontrado o revocado', message 'Este código no corresponde a un certificado válido'. Add Schema.org markup: <script type='application/ld+json'> with @type: EducationalOccupationalCredential, name, credentialCategory, educationalLevel. Set page metadata for SEO: title, description. Style consistent with landing page.

**Test Strategy:**

Generate certificado, visit /verify/{codigo}, verify valid display. Test invalid codigo shows error. Check page source for Schema.org markup. Test SEO meta tags with curl or view-source.
