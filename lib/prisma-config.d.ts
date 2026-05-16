// Ambient declaration so the root TS checker doesn't error if it reaches
// backend/prisma.config.ts (which uses prisma/config — a backend-only dep)
declare module "prisma/config" {
  export function defineConfig(config: {
    datasource?: { url?: string };
    [key: string]: unknown;
  }): unknown;
}
