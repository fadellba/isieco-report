import {
  Inject,
  Injectable,
  Logger,
  type MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'pg';
import { interval, map, merge, Subject, takeUntil, timer, type Observable } from 'rxjs';

export const COMMAND_CENTER_PG_CLIENT_FACTORY = Symbol('COMMAND_CENTER_PG_CLIENT_FACTORY');
const COMMAND_CENTER_NOTIFY_CHANNEL = 'command_center_changed';

export interface CommandCenterListenerClientConfig {
  connectionString: string;
  connectionTimeoutMillis: number;
  ssl?: {
    ca: string;
    rejectUnauthorized: true;
  };
}

export type CommandCenterListenerClientFactory = (
  config: CommandCenterListenerClientConfig,
) => Client;

@Injectable()
export class CommandCenterEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommandCenterEventsService.name);
  private readonly events = new Subject<MessageEvent>();
  private readonly shutdown = new Subject<void>();
  private listenerClient: Client | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryAttempt = 0;
  private stopping = false;

  constructor(
    @Inject(COMMAND_CENTER_PG_CLIENT_FACTORY)
    private readonly createClient: CommandCenterListenerClientFactory,
  ) {}

  stream(): Observable<MessageEvent> {
    return merge(
      this.events.asObservable(),
      interval(15_000).pipe(
        map(() => ({
          type: 'heartbeat',
          data: { at: new Date().toISOString() },
        })),
      ),
    ).pipe(takeUntil(merge(timer(60_000), this.shutdown)));
  }

  async onModuleInit(): Promise<void> {
    if (process.env.OPENAPI_GENERATION === 'true') return;
    await this.startListening();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.shutdown.next();
    this.shutdown.complete();
    this.events.complete();

    const client = this.listenerClient;
    this.listenerClient = null;
    if (client) await client.end().catch(() => undefined);
  }

  private listenerConfig(): CommandCenterListenerClientConfig {
    const connectionString = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error('DIRECT_URL or DATABASE_URL is required for PostgreSQL LISTEN.');
    }

    const config: CommandCenterListenerClientConfig = {
      connectionString,
      connectionTimeoutMillis: 5_000,
    };
    const caCertificate = process.env.STAGING_SUPABASE_CA_CERT?.trim();
    if (caCertificate) {
      if (
        !caCertificate.includes('-----BEGIN CERTIFICATE-----') ||
        !caCertificate.includes('-----END CERTIFICATE-----')
      ) {
        throw new Error('STAGING_SUPABASE_CA_CERT must contain a PEM-encoded CA certificate.');
      }
      const databaseUrl = new URL(connectionString);
      for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']) {
        databaseUrl.searchParams.delete(parameter);
      }
      config.connectionString = databaseUrl.toString();
      config.ssl = { ca: caCertificate, rejectUnauthorized: true };
    }
    return config;
  }

  private async startListening(): Promise<void> {
    if (this.stopping || this.listenerClient) return;

    let client: Client | null = null;
    try {
      client = this.createClient(this.listenerConfig());
      this.listenerClient = client;
      client.on('notification', (notification) => {
        if (
          notification.channel !== COMMAND_CENTER_NOTIFY_CHANNEL ||
          notification.payload !== 'invalidate'
        ) return;
        this.events.next({
          type: 'command_center_changed',
          data: { invalidated: true },
        });
      });
      client.on('error', () => this.handleDisconnect(client!));
      client.on('end', () => this.handleDisconnect(client!));

      await client.connect();
      await client.query(`LISTEN ${COMMAND_CENTER_NOTIFY_CHANNEL}`);
      if (this.listenerClient !== client || this.stopping) return;

      this.retryAttempt = 0;
      this.logger.log('PostgreSQL command-center invalidation listener connected.');
      this.events.next({
        type: 'command_center_changed',
        data: { reason: 'listener_connected' },
      });
    } catch {
      if (client) this.handleDisconnect(client);
      else {
        this.logger.warn('PostgreSQL command-center listener could not be configured; retry scheduled.');
        this.scheduleReconnect();
      }
    }
  }

  private handleDisconnect(client: Client): void {
    if (this.listenerClient !== client || this.stopping) return;
    this.listenerClient = null;
    this.logger.warn('PostgreSQL command-center listener disconnected; retry scheduled.');
    void client.end().catch(() => undefined);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.retryAttempt);
    this.retryAttempt = Math.min(this.retryAttempt + 1, 5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.startListening();
    }, delay);
    this.reconnectTimer.unref?.();
  }
}
