import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localDatabaseUrl =
  'postgresql://isieco:isieco_dev_password@localhost:5432/isieco_report?schema=public';
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? localDatabaseUrl;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

function databaseIdentity(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return connectionString;
  }
}

if (
  shadowDatabaseUrl &&
  databaseIdentity(shadowDatabaseUrl) === databaseIdentity(databaseUrl)
) {
  throw new Error('SHADOW_DATABASE_URL must point to a different PostgreSQL database.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DIRECT_URL doit être une URL PostgreSQL directe pour les migrations Supabase.
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
