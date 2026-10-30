const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUrl(value, key, allowedProtocols, errors) {
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

/**
 * Validate the runtime configuration before NestJS creates application providers.
 * Only variable names are included in errors; secret values are never echoed.
 *
 * @param {Record<string, unknown>} config
 * @returns {Record<string, unknown>}
 */
export function validateEnvironment(config) {
  const errors = [];

  parseUrl(config.DATABASE_URL, 'DATABASE_URL', POSTGRES_PROTOCOLS, errors);
  parseUrl(config.SUPABASE_URL, 'SUPABASE_URL', HTTP_PROTOCOLS, errors);

  if (!isNonEmptyString(config.SUPABASE_ANON_KEY)) {
    errors.push('SUPABASE_ANON_KEY must be configured.');
  }

  if (config.DIRECT_URL !== undefined && config.DIRECT_URL !== '') {
    parseUrl(config.DIRECT_URL, 'DIRECT_URL', POSTGRES_PROTOCOLS, errors);
  }

  const port = config.PORT === undefined ? 3000 : Number(config.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }

  if (config.WEB_ORIGIN !== undefined && config.WEB_ORIGIN.trim() !== '') {
    const origins = config.WEB_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
    for (const origin of origins) {
      const parsed = parseUrl(origin, 'WEB_ORIGIN', HTTP_PROTOCOLS, errors);
      if (
        parsed &&
        (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)
      ) {
        errors.push('WEB_ORIGIN entries must be origins without paths, credentials, queries or fragments.');
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
