# Task ID: 24

**Title:** Create conditional logger to replace console.log in production

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Build centralized logging utility that suppresses console.log in production except for errors/warnings

**Details:**

Create backend/src/lib/logger.ts with log(level: 'info'|'warn'|'error', message: string, meta?: object) function. Only write to stdout if NODE_ENV !== 'production' OR level is 'error'/'warn'. Use console.error for error level, console.warn for warn, console.log for info. Search backend/src/routes/ and backend/src/lib/ for all console.log statements (found in: index.ts, seed-admin.ts, whatsapp.webhook.ts, whatsapp-send.ts, redis.ts per Grep results). Replace with logger.log('info', ...) or appropriate level. Import logger in each affected file.

**Test Strategy:**

Set NODE_ENV=production locally, run server, verify info logs don't appear but errors still show. Test in Railway after deploy. Use grep to confirm no direct console.log remains in routes/ and lib/.
