import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class MediaStorageService {
  constructor(private readonly config: ConfigService) {}

  private clientFor(accessToken: string): SupabaseClient {
    const url = this.config.get<string>('SUPABASE_URL');
    const anonKey = this.config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey || !accessToken) {
      throw new BadGatewayException('Le stockage privé des médias n’est pas configuré.');
    }

    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });
  }

  async upload(
    bucket: string,
    objectPath: string,
    buffer: Buffer,
    contentType: string,
    accessToken: string,
  ): Promise<void> {
    const { error } = await this.clientFor(accessToken)
      .storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });
    if (error) {
      throw new BadGatewayException('Le téléversement du média vers le stockage privé a échoué.');
    }
  }

  async createSignedUrl(
    bucket: string,
    objectPath: string,
    accessToken: string,
  ): Promise<string> {
    const { data, error } = await this.clientFor(accessToken)
      .storage
      .from(bucket)
      .createSignedUrl(objectPath, 120);
    if (error || !data?.signedUrl) {
      throw new BadGatewayException('Le média privé ne peut pas être rendu accessible pour le moment.');
    }
    return data.signedUrl;
  }

  async removeUnregisteredObject(
    bucket: string,
    objectPath: string,
    accessToken: string,
  ): Promise<void> {
    const { error } = await this.clientFor(accessToken)
      .storage
      .from(bucket)
      .remove([objectPath]);
    if (error) {
      throw new BadGatewayException('Le nettoyage du média temporaire a échoué.');
    }
  }
}
