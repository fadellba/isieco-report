import { NestFactory } from '@nestjs/core';
import { StorageMaintenanceModule } from './storage-maintenance.module.js';
import { MediaPurgeService } from './media-purge.service.js';

function safeErrorSummary(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 500);

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const message = error.message
    .replace(/postgres(?:ql)?:\/\/[^\s"'\x60]+/giu, '[database URL redacted]')
    .replace(/sb_(?:secret|publishable|anon)_[A-Za-z0-9._-]+/gu, '[Supabase key redacted]')
    .slice(0, 500);

  return [error.name || 'Error', code ? `[${code}]` : '', message].filter(Boolean).join(': ');
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(StorageMaintenanceModule, {
    logger: ['error', 'warn'],
  });

  try {
    const result = await app.get(MediaPurgeService).purgeExpiredMedia();
    process.stdout.write(`${JSON.stringify(result)}\\n`);
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap().catch((error: unknown) => {
  process.stderr.write(`Le traitement de purge des médias a échoué: ${safeErrorSummary(error)}\\n`);
  process.exitCode = 1;
});
