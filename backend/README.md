# MEA International — Backend

Express + Prisma + MySQL API deployed on Railway.

## Database migrations

**Pre-deploy command (Railway):** `npx prisma migrate deploy`

> Do NOT use `prisma db push` in production. It bypasses migration history and can cause schema drift or data loss.

### Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>` locally to generate the migration SQL
3. Commit the generated file in `prisma/migrations/`
4. Push — Railway's pre-deploy command applies it automatically via `prisma migrate deploy`

### Baseline

The `0_init` migration is an empty baseline marking the tables that existed before the migration system was introduced. It was applied once in Railway with:

```bash
cd backend && npx prisma migrate resolve --applied 0_init
```
