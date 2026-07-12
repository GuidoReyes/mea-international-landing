# Task ID: 13

**Title:** Configure Cloudflare DNS, CDN, and WAF

**Status:** done

**Dependencies:** 2 ✓

**Priority:** medium

**Description:** Set up Cloudflare account, configure DNS records for frontend and backend, enable WAF, Bot Fight Mode, and rate limiting.

**Details:**

1) Create Cloudflare account, add domain meainternational.com. 2) Update nameservers at domain registrar to Cloudflare's (provided in Cloudflare dashboard). Wait for DNS propagation. 3) Add DNS records: CNAME @ pointing to cname.vercel-dns.com (proxy enabled/orange), CNAME www pointing to cname.vercel-dns.com (proxy enabled), CNAME api pointing to Railway backend domain {project}.up.railway.app (proxy enabled). 4) In Cloudflare Security > WAF, enable OWASP Core Ruleset (Managed Rules). 5) Enable Bot Fight Mode in Security > Bots. 6) Create Rate Limiting rule in Security > WAF > Rate limiting: 100 requests per minute per IP address for all paths. 7) SSL/TLS mode: Full (strict). 8) In Vercel project settings, add custom domain meainternational.com and www.meainternational.com. 9) Update Railway env FRONTEND_URL=https://meainternational.com.

**Test Strategy:**

Verify DNS resolves: dig meainternational.com should show Cloudflare IPs. Access https://meainternational.com - should load Next.js frontend via Cloudflare (check for cf-ray header). Access https://api.meainternational.com/health - should return from Railway via Cloudflare. Test WAF by triggering SQL injection pattern (should block). Verify rate limiting by sending 101+ requests in 1 minute.
