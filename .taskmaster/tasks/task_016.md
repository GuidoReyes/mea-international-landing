# Task ID: 16

**Title:** Configure CI/CD and Environment Variables

**Status:** done

**Dependencies:** 2 ✓, 13 ✓

**Priority:** high

**Description:** Configure all environment variables in Railway and Vercel, document deployment strategy, and verify auto-deployment on git push to main.

**Details:**

1) In Railway backend project variables, verify all are set: DATABASE_URL (auto), REDIS_URL (auto), PORT (auto), JWT_SECRET, META_WHATSAPP_TOKEN, META_PHONE_ID, META_WABA_ID, META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, ANTHROPIC_API_KEY, NOTION_TOKEN, NOTION_DATABASE_IDS, FRONTEND_URL=https://meainternational.com. 2) In Vercel project settings, add NEXT_PUBLIC_API_URL=https://api.meainternational.com. 3) Configure Railway to deploy on push to main branch (should be default). 4) Configure Vercel to deploy on push to main (should be default). 5) Document branch strategy in README: daily work in branches named `sesion-YYYYMMDD`, merge to main at end of day triggers deployment. 6) Create .env.example in backend with all variables (with placeholder values). 7) Update root README.md with deployment info, environment setup instructions, and branch strategy.

**Test Strategy:**

Create test branch `sesion-20260507`. Make minor change (add comment). Push to branch - verify Railway and Vercel DO NOT deploy. Merge to main - verify both Railway and Vercel trigger builds and deploy successfully. Check Railway logs show new deployment. Check Vercel deployment log. Access https://meainternational.com and https://api.meainternational.com/health to verify both are updated.
