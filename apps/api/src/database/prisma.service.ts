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
