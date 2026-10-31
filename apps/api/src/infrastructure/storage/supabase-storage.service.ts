import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { ValidatedImageFile } from './media-file.js';

const SIGNED_URL_TTL_SECONDS = 60;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

@Injectable()
export class SupabaseStorageService {
  private readonly client: ReturnType<typeof createClient> | null;
  private readonly bucket: string;
  private readonly retentionDays: number | null;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const secretKey = config.get<string>('SUPABASE_SECRET_KEY');

    this.client =
      supabaseUrl && secretKey
        ? createClient(supabaseUrl, secretKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            },
          })
        : null;

    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'isieco-private-media';
    const retentionValue = config.get<string>('MEDIA_RETENTION_DAYS');
    const parsedRetention = retentionValue ? Number(retentionValue) : NaN;
    this.retentionDays =
      Number.isInteger(parsedRetention) && parsedRetention >= 1 && parsedRetention <= 3650
        ? parsedRetention
        : null;
  }

  getExpirationDate(from: Date = new Date()): Date {
    if (this.retentionDays === null) {
      throw new ServiceUnavailableException(
        'La durée de conservation des médias (MEDIA_RETENTION_DAYS) doit être configurée.',
      );
    }
    return new Date(from.getTime() + this.retentionDays * DAY_IN_MILLISECONDS);
  }

  async upload(path: string, file: ValidatedImageFile): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.storage.from(this.bucket).upload(path, file.buffer, {
      contentType: file.contentType,
      cacheControl: '60',
      upsert: false,
    });

    if (error) {
      throw new ServiceUnavailableException('Le stockage privé des médias est indisponible.');
    }
  }

  async createSignedUrl(path: string): Promise<{ signedUrl: string; expiresInSeconds: number }> {
    const client = this.requireClient();
    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException('La consultation temporaire du média est indisponible.');
    }

    return { signedUrl: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
  }

  async remove(path: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.storage.from(this.bucket).remove([path]);
    if (error) {
      throw new ServiceUnavailableException('Le nettoyage du média temporaire a échoué.');
    }
  }

  private requireClient(): ReturnType<typeof createClient> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Le stockage des médias n’est pas configuré. Renseignez SUPABASE_SECRET_KEY.',
      );
    }
    return this.client;
  }
}
