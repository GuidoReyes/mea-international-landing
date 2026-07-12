# Task ID: 23

**Title:** Add HTTP security headers to Next.js config

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Configure security headers in next.config.ts including CSP, HSTS, X-Frame-Options, and other protective headers

**Details:**

Extend next.config.ts with headers() async function returning array of header objects. Add X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security with 2-year max-age and includeSubDomains, Content-Security-Policy allowing self + Cloudflare Turnstile + API domain, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy restricting camera/microphone/geolocation. Apply to all routes using source: '/:path*'. Verify helmet() remains active in backend Express (already configured in backend/src/index.ts:15).

**Test Strategy:**

Deploy to Vercel preview, verify headers with curl -I or browser DevTools Network tab. Test CSP doesn't break existing functionality. Confirm helmet() active by checking backend /health endpoint headers.

## Subtasks

### 23.1. Add headers() async function to next.config.ts with basic security headers

**Status:** pending  
**Dependencies:** None  

Extend next.config.ts with headers() async function returning array of header objects for all routes. Add X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.

**Details:**

Open next.config.ts (currently 11 lines with only typescript.ignoreBuildErrors config). Add async headers() function to the NextConfig object. Return array with one object: source: '/:path*' matching all routes. Add key: value pairs for headers: 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin'. Follow Next.js headers() API format from node_modules/next/dist/docs/. Preserve existing typescript.ignoreBuildErrors: true config.

### 23.2. Add HSTS (Strict-Transport-Security) header with 2-year max-age

**Status:** pending  
**Dependencies:** 23.1  

Add Strict-Transport-Security header to headers() function with max-age=63072000 (2 years) and includeSubDomains directive.

**Details:**

In the headers array object created in subtask 1, add 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'. max-age=63072000 equals 2 years in seconds (365 days * 2 * 24 * 60 * 60). includeSubDomains applies HSTS to all subdomains. preload makes it eligible for browser HSTS preload lists. This header forces HTTPS connections for 2 years after first visit.

### 23.3. Add Content-Security-Policy header allowing self, Turnstile, and API domain

**Status:** pending  
**Dependencies:** 23.1  

Add CSP header to headers() function allowing self, Cloudflare Turnstile domains, and the backend API domain (mea.edu.gt).

**Details:**

In the headers array object, add 'Content-Security-Policy' with directives: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.mea.edu.gt https://www.mea.edu.gt; frame-src https://challenges.cloudflare.com. This allows: scripts from same origin + Turnstile, styles from same origin with inline, images from same origin + data URIs + any HTTPS, API calls to backend, iframes for Turnstile challenges. Use template literal or string concatenation for readability.

### 23.4. Add Permissions-Policy header and verify backend helmet() configuration

**Status:** pending  
**Dependencies:** 23.1  

Add Permissions-Policy header restricting camera, microphone, and geolocation. Verify backend helmet() middleware is active at /health endpoint.

**Details:**

In next.config.ts headers array, add 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' to restrict sensitive browser features. Then verify backend helmet() is active: check backend/src/index.ts:15 shows app.use(helmet()) before routes. Test backend /health endpoint returns helmet headers. Backend helmet() and frontend Next.js headers() work independently - backend protects API routes, frontend protects app routes. No changes needed to backend (helmet already configured).
