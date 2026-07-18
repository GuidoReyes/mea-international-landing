# Task ID: 158

**Title:** Update Alumno schema for optional email and unique whatsapp

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Modify Prisma schema to support dual registration: email optional+unique, whatsapp unique, add OtpCode model

**Details:**

In backend/prisma/schema.prisma: Change Alumno.email to 'String? @unique' (optional), change Alumno.whatsapp to 'String? @unique' (add unique constraint). Create new OtpCode model: { id Int @id @default(autoincrement()), whatsapp String, codigo String (bcrypt hash), expiraEn DateTime, usado Boolean @default(false), creadoEn DateTime @default(now()) } with index on whatsapp. Before db push, write migration script to check for duplicate whatsapp values and resolve them. Application rule: at least one of email or whatsapp must be set (enforce in API validation).

**Test Strategy:**

Run prisma db push successfully, verify schema changes in database, test creating Alumno with only email, with only whatsapp, with both, verify unique constraints work, verify OtpCode table created with indexes
