# Task ID: 27

**Title:** Configure Cloudflare 301 redirect from apex to www

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Set up redirect rule in Cloudflare to force www subdomain for consistency

**Details:**

In Cloudflare dashboard → Rules → Redirect Rules → Create rule. Name: 'Apex to WWW'. If: Hostname equals 'mea.edu.gt', Then: Dynamic redirect with Expression 'concat("https://www.mea.edu.gt", http.request.uri.path)' and Status code 301 Permanent. Verify DNS: A/AAAA record for @ (apex) points to Vercel IPs with Cloudflare proxy (orange cloud) enabled. Test both mea.edu.gt and www.mea.edu.gt resolve and redirect properly.

**Test Strategy:**

Use curl -I http://mea.edu.gt to verify 301 redirect to https://www.mea.edu.gt. Test with and without paths (/cursos, /admin). Verify SSL works on both. Check Vercel domain settings show both domains.
