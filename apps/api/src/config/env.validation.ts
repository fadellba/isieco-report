const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUrl(
  value: unknown,
  key: string,
  allowedProtocols: ReadonlySet<string>,
  errors: string[],
): URL | null {
  if (!isNonEmptyString(value)) {
    errors.push(`${key} must be a non-empty URL.`);
    return null;
  }

  try {
    const parsed = new URL(value);
    if (!allowedProtocols.has(parsed.protocol) || !parsed.hostname) {
      errors.push(`${key} must use one of the supported URL protocols.`);
      return null;
    }
    return parsed;
  } catch {
    errors.push(`${key} must be a valid URL.`);
    return null;
  }
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];

  parseUrl(config.DATABASE_URL, 'DATABASE_URL', POSTGRES_PROTOCOLS, errors);
  parseUrl(config.SUPABASE_URL, 'SUPABASE_URL', HTTP_PROTOCOLS, errors);

  if (!isNonEmptyString(config.SUPABASE_ANON_KEY)) {
    errors.push('SUPABASE_ANON_KEY must be configured.');
  }

  const storageSecret = config.SUPABASE_SECRET_KEY;
  if (storageSecret !== undefined && storageSecret !== null && storageSecret !== '' && !isNonEmptyString(storageSecret)) {
    errors.push('SUPABASE_SECRET_KEY must be a non-empty server-side secret when provided.');
  }

  const storageBucket = config.SUPABASE_STORAGE_BUCKET;
  if (storageBucket !== undefined && storageBucket !== null && storageBucket !== '' && !/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/u.test(String(storageBucket))) {
    errors.push('SUPABASE_STORAGE_BUCKET must be a valid bucket identifier when provided.');
  }

  const mediaRetentionDays = config.MEDIA_RETENTION_DAYS;
  if (mediaRetentionDays !== undefined && mediaRetentionDays !== null && mediaRetentionDays !== '') {
    const parsedRetentionDays = Number(mediaRetentionDays);
    if (!Number.isInteger(parsedRetentionDays) || parsedRetentionDays < 1 || parsedRetentionDays > 3650) {
      errors.push('MEDIA_RETENTION_DAYS must be an integer between 1 and 3650 when provided.');
    }
  }

  const directUrl = config.DIRECT_URL;
  if (directUrl !== undefined && directUrl !== null && directUrl !== '') {
    parseUrl(directUrl, 'DIRECT_URL', POSTGRES_PROTOCOLS, errors);
  }

  const port = config.PORT === undefined ? 3000 : Number(config.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }

  const webOrigin = config.WEB_ORIGIN;
  if (webOrigin !== undefined && webOrigin !== null && webOrigin !== '') {
    if (!isNonEmptyString(webOrigin)) {
      errors.push('WEB_ORIGIN must be a comma-separated list of HTTP(S) origins.');
    } else {
      const origins = webOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
      for (const origin of origins) {
        const parsed = parseUrl(origin, 'WEB_ORIGIN', HTTP_PROTOCOLS, errors);
        if (
          parsed &&
          (parsed.username ||
            parsed.password ||
            parsed.pathname !== '/' ||
            parsed.search ||
            parsed.hash)
        ) {
          errors.push(
            'WEB_ORIGIN entries must be origins without paths, credentials, queries or fragments.',
          );
        }
      }
    }
  }

  if (
    config.NODE_ENV !== undefined &&
    !['development', 'test', 'production'].includes(String(config.NODE_ENV))
  ) {
    errors.push('NODE_ENV must be development, test or production.');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid API environment configuration: ${errors.join(' ')}`);
  }

  return config;
}
