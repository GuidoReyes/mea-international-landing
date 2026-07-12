# Task ID: 26

**Title:** Change Railway pre-deploy command to prisma migrate deploy

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Update Railway deployment configuration to use safe migration command instead of db push

**Details:**

In Railway dashboard → backend service → Settings → Deploy → Pre-deploy command: change from 'npx prisma db push' to 'npx prisma migrate deploy'. Document in backend/README.md or root README.md the reason: 'prisma migrate deploy' applies committed migrations without schema drift, safer for production. 'db push' bypasses migration history and can cause data loss. Add note that all schema changes must go through 'prisma migrate dev' locally first, then commit migration files.

**Test Strategy:**

Trigger Railway deploy, check build logs to confirm 'prisma migrate deploy' runs. Verify existing migrations apply successfully. Test that new migration created locally with 'migrate dev' deploys correctly on next push.
