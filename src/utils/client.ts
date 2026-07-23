import { ImmyBotClient, type ImmyBotConfig } from '@wyre-technology/node-immybot';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from './logger.js';

/**
 * Credentials for ImmyBot client
 */
export interface Credentials {
  instanceSubdomain: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Per-request credential store. In gateway mode the HTTP layer runs each
 * request inside runWithCredentials(creds, handler) so concurrent requests
 * from different tenants never observe each other's credentials. Falls back
 * to environment variables for direct (stdio) mode.
 */
const credentialStore = new AsyncLocalStorage<Credentials>();

export function runWithCredentials<T>(creds: Credentials, fn: () => T): T {
  return credentialStore.run(creds, fn);
}

/**
 * Get credentials — first from AsyncLocalStorage (gateway mode), then from
 * environment variables (direct / stdio mode).
 */
function getCredentials(): Credentials | null {
  const scoped = credentialStore.getStore();
  if (scoped) return scoped;

  const isGatewayMode = process.env.AUTH_MODE === 'gateway';
  if (isGatewayMode) {
    // No per-request context and gateway mode expects credentials on every
    // request — there is nothing to fall back to.
    logger.debug('Gateway mode: no request-scoped credentials available');
    return null;
  }

  // Direct mode: credentials from environment
  const instanceSubdomain = process.env.IMMYBOT_INSTANCE_SUBDOMAIN;
  const tenantId = process.env.IMMYBOT_TENANT_ID;
  const clientId = process.env.IMMYBOT_CLIENT_ID;
  const clientSecret = process.env.IMMYBOT_CLIENT_SECRET;

  if (!instanceSubdomain || !tenantId || !clientId || !clientSecret) {
    logger.warn('Direct mode: Missing ImmyBot credentials in environment');
    return null;
  }

  return { instanceSubdomain, tenantId, clientId, clientSecret };
}

/**
 * Client cache keyed by credential fingerprint so different tenants get
 * separate client instances, but repeated calls for the same tenant reuse
 * one. Never invalidated by another request's credentials — there is no
 * shared "current" client, only entries keyed by identity.
 */
const clientCache = new Map<string, ImmyBotClient>();

function credentialKey(creds: Credentials): string {
  return `${creds.instanceSubdomain}:${creds.tenantId}:${creds.clientId}`;
}

/**
 * Get ImmyBot client instance for the current request's credentials
 * (AsyncLocalStorage in gateway mode, environment variables in direct mode).
 */
export async function getClient(): Promise<ImmyBotClient> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'No ImmyBot credentials configured. In gateway mode, ensure headers are set. In direct mode, set environment variables.'
    );
  }

  const key = credentialKey(creds);
  let client = clientCache.get(key);

  if (!client) {
    logger.debug('Creating new ImmyBot client', {
      instanceSubdomain: creds.instanceSubdomain,
      tenantId: creds.tenantId,
      clientId: creds.clientId.substring(0, 8) + '...',
    });

    const config: ImmyBotConfig = {
      instanceSubdomain: creds.instanceSubdomain,
      tenantId: creds.tenantId,
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      timeout: 30000,
      userAgent: 'wyre-immybot-mcp/1.0',
    };

    client = new ImmyBotClient(config);
    clientCache.set(key, client);
  }

  return client;
}

/**
 * Clear all cached clients (useful for testing).
 */
export function resetClient(): void {
  logger.debug('Resetting ImmyBot client cache');
  clientCache.clear();
}

/**
 * Test client connectivity
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getClient();
    const result = await client.testConnection();
    return result.connected && result.authenticated;
  } catch (error) {
    logger.error('Connection test failed', { error });
    return false;
  }
}
