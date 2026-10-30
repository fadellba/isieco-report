import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localDatabaseUrl =
  'postgresql://isieco:isieco_dev_password@localhost:5432/isieco_report?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DIRECT_URL doit être une URL PostgreSQL directe pour les migrations Supabase.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? localDatabaseUrl,
  },
});
