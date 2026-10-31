import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from './swagger.config.js';

async function generateOpenApi(): Promise<void> {
  process.env.OPENAPI_GENERATION = 'true';
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  try {
    const document = createOpenApiDocument(app);
    const outputPath = resolve(process.cwd(), '../../docs/api/openapi.json');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    process.stdout.write(`OpenAPI document generated: ${outputPath}\n`);
  } finally {
    await app.close();
  }
}

void generateOpenApi().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
