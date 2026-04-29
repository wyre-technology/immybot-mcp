import { ImmyBotClient, type ImmyBotConfig } from '@wyre-technology/node-immybot';
import { logger } from './logger.js';

/**
 * Credentials for ImmyBot client
 */
interface Credentials {
  instanceSubdomain: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Client singleton with credential management for gateway mode
 */
let _client: ImmyBotClient | null = null;
let _credentials: Credentials | null = null;

/**
 * Get credentials from environment variables or headers (gateway mode)
 */
function getCredentials(): Credentials | null {
  const isGatewayMode = process.env.AUTH_MODE === 'gateway';

  if (isGatewayMode) {
    // In gateway mode, credentials come from injected headers
    const instanceSubdomain = process.env.X_IMMYBOT_INSTANCE_SUBDOMAIN;
    const tenantId = process.env.X_IMMYBOT_TENANT_ID;
    const clientId = process.env.X_IMMYBOT_CLIENT_ID;
    const clientSecret = process.env.X_IMMYBOT_CLIENT_SECRET;

    if (!instanceSubdomain || !tenantId || !clientId || !clientSecret) {
      logger.debug('Gateway mode: Missing credentials in environment', {
        hasInstanceSubdomain: !!instanceSubdomain,
        hasTenantId: !!tenantId,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return null;
    }

    return {
      instanceSubdomain,
      tenantId,
      clientId,
      clientSecret,
    };
  } else {
    // Direct mode: credentials from environment
    const instanceSubdomain = process.env.IMMYBOT_INSTANCE_SUBDOMAIN;
    const tenantId = process.env.IMMYBOT_TENANT_ID;
    const clientId = process.env.IMMYBOT_CLIENT_ID;
    const clientSecret = process.env.IMMYBOT_CLIENT_SECRET;

    if (!instanceSubdomain || !tenantId || !clientId || !clientSecret) {
      logger.warn('Direct mode: Missing ImmyBot credentials in environment');
      return null;
    }

    return {
      instanceSubdomain,
      tenantId,
      clientId,
      clientSecret,
    };
  }
}

/**
 * Get ImmyBot client instance
 * Automatically handles credential changes in gateway mode
 */
export async function getClient(): Promise<ImmyBotClient> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('No ImmyBot credentials configured. In gateway mode, ensure headers are set. In direct mode, set environment variables.');
  }

  // Invalidate cache if credentials changed (important for gateway mode)
  if (_client && _credentials) {
    const credsChanged =
      creds.instanceSubdomain !== _credentials.instanceSubdomain ||
      creds.tenantId !== _credentials.tenantId ||
      creds.clientId !== _credentials.clientId ||
      creds.clientSecret !== _credentials.clientSecret;

    if (credsChanged) {
      logger.debug('Credentials changed, invalidating client cache');
      _client = null;
      _credentials = null;
    }
  }

  // Create new client if needed
  if (!_client) {
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

    _client = new ImmyBotClient(config);
    _credentials = creds;
  }

  return _client;
}

/**
 * Reset client cache (useful for testing or manual invalidation)
 */
export function resetClient(): void {
  logger.debug('Resetting ImmyBot client cache');
  _client = null;
  _credentials = null;
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