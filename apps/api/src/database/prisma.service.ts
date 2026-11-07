import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL doit être défini avant le démarrage de l’API.');
    }
    const caCertificate = process.env.STAGING_SUPABASE_CA_CERT?.trim();
    if (caCertificate) {
      if (
        !caCertificate.includes('-----BEGIN CERTIFICATE-----') ||
        !caCertificate.includes('-----END CERTIFICATE-----')
      ) {
        throw new Error('STAGING_SUPABASE_CA_CERT must contain a PEM-encoded CA certificate.');
      }

      // node-postgres replaces its explicit SSL object when SSL parameters remain in the URL.
      const databaseUrl = new URL(connectionString);
      for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']) {
        databaseUrl.searchParams.delete(parameter);
      }

      super({
        adapter: new PrismaPg({
          connectionString: databaseUrl.toString(),
          ssl: { ca: caCertificate, rejectUnauthorized: true },
        }),
      });
      return;
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.OPENAPI_GENERATION === 'true') return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.OPENAPI_GENERATION === 'true') return;
    await this.$disconnect();
  }
}
