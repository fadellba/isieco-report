import type { ApiErrorResponse } from '@isieco/shared';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: ApiErrorResponse,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Client fetch commun au Web et au Mobile. Aucune clé serveur ne doit être fournie ici. */
export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  return {
    async request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
      const token = await options.getAccessToken?.();
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
      if (init.body && !headers.has('Content-Type') && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
        ...init,
        headers,
      });

      const contentType = response.headers.get('content-type') ?? '';
      const body: unknown = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const payload = typeof body === 'object' && body !== null
          ? (body as ApiErrorResponse)
          : undefined;
        throw new ApiRequestError(
          payload?.message ?? `API request failed (${response.status})`,
          response.status,
          payload,
        );
      }

      return body as TResponse;
    },
  };
}
