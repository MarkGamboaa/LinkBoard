import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prefer a direct/session-mode URL for Prisma migrations. The app itself
    // continues to use DATABASE_URL, which may use Supavisor transaction mode.
    url: process.env.DIRECT_URL || env('DATABASE_URL'),
  },
});
