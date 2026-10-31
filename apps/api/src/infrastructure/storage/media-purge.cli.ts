import { NestFactory } from '@nestjs/core';
import { StorageMaintenanceModule } from './storage-maintenance.module.js';
import { MediaPurgeService } from './media-purge.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(StorageMaintenanceModule, {
    logger: ['error', 'warn'],
  });

  try {
    const result = await app.get(MediaPurgeService).purgeExpiredMedia();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap().catch(() => {
  process.stderr.write('Le traitement de purge des médias a échoué.\n');
  process.exitCode = 1;
});
