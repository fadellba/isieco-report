import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type User } from '@supabase/supabase-js';

/**
 * Le serveur valide chaque access token auprès de Supabase Auth avec la clé publique.
 * Une éventuelle clé secrète reste réservée aux services serveur qui en ont besoin
 * (par exemple Storage) et ne doit jamais être exposée aux clients.
 */
@Injectable()
export class SupabaseAuthService {
  private readonly client: ReturnType<typeof createClient>;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const supabaseKey = config.get<string>('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL et SUPABASE_ANON_KEY doivent être configurés.');
    }
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async validateAccessToken(accessToken: string): Promise<User> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) throw new UnauthorizedException('Session invalide ou expirée.');
    return data.user;
  }
}
