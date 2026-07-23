import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const instances: Array<{ config: Record<string, unknown> }> = [];
  class FakeImmyBotClient {
    config: Record<string, unknown>;
    constructor(config: Record<string, unknown>) {
      this.config = config;
      instances.push(this);
    }
    async testConnection() {
      return { connected: true, authenticated: true };
    }
  }
  return { FakeImmyBotClient, instances };
});

vi.mock('@wyre-technology/node-immybot', () => ({
  ImmyBotClient: mocks.FakeImmyBotClient,
}));

import { getClient, resetClient, runWithCredentials, testConnection } from '../utils/client.js';

const ENV_KEYS = [
  'AUTH_MODE',
  'IMMYBOT_INSTANCE_SUBDOMAIN',
  'IMMYBOT_TENANT_ID',
  'IMMYBOT_CLIENT_ID',
  'IMMYBOT_CLIENT_SECRET',
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  resetClient();
  mocks.instances.length = 0;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const creds = (suffix: string) => ({
  instanceSubdomain: `tenant-${suffix}`,
  tenantId: `tenant-id-${suffix}`,
  clientId: `client-${suffix}`,
  clientSecret: `secret-${suffix}`,
});

describe('getClient (direct/env mode)', () => {
  it('throws a clear error when credentials are missing', async () => {
    await expect(getClient()).rejects.toThrow(/No ImmyBot credentials configured/);
  });

  it('builds a client from env credentials', async () => {
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = 'acme';
    process.env.IMMYBOT_TENANT_ID = 't-1';
    process.env.IMMYBOT_CLIENT_ID = 'c-1';
    process.env.IMMYBOT_CLIENT_SECRET = 's-1';

    const client = await getClient();

    expect(mocks.instances).toHaveLength(1);
    expect(mocks.instances[0].config).toMatchObject({
      instanceSubdomain: 'acme',
      tenantId: 't-1',
      clientId: 'c-1',
      clientSecret: 's-1',
    });
    expect(client).toBe(mocks.instances[0]);
  });

  it('reuses the cached client for the same credentials', async () => {
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = 'acme';
    process.env.IMMYBOT_TENANT_ID = 't-1';
    process.env.IMMYBOT_CLIENT_ID = 'c-1';
    process.env.IMMYBOT_CLIENT_SECRET = 's-1';

    const first = await getClient();
    const second = await getClient();

    expect(second).toBe(first);
    expect(mocks.instances).toHaveLength(1);
  });

  it('returns null / throws when gateway mode has no request-scoped context', async () => {
    process.env.AUTH_MODE = 'gateway';
    // No runWithCredentials wrapping — simulates a request with no valid headers
    await expect(getClient()).rejects.toThrow(/No ImmyBot credentials configured/);
  });
});

describe('request-scoped credentials (AsyncLocalStorage)', () => {
  it('gateway-mode calls use the ALS-scoped credentials, not env', async () => {
    process.env.AUTH_MODE = 'gateway';
    // Even if stray env vars were set, gateway mode should never read them —
    // only the ALS-scoped credentials for this request matter.
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = 'env-leak';

    await runWithCredentials(creds('scoped'), async () => {
      const client = await getClient();
      expect((client as any).config.instanceSubdomain).toBe('tenant-scoped');
    });
  });

  it('does not contaminate a concurrent request with another tenant\'s credentials', async () => {
    const results: string[] = [];

    await Promise.all([
      runWithCredentials(creds('a'), async () => {
        await new Promise(r => setTimeout(r, 10));
        const client = await getClient();
        results.push((client as any).config.tenantId);
      }),
      runWithCredentials(creds('b'), async () => {
        await new Promise(r => setTimeout(r, 5));
        const client = await getClient();
        results.push((client as any).config.tenantId);
      }),
    ]);

    expect(results.sort()).toEqual(['tenant-id-a', 'tenant-id-b']);
    // Each tenant gets its own cached client, keyed by credential fingerprint.
    expect(mocks.instances).toHaveLength(2);
    const configs = mocks.instances.map(i => i.config);
    expect(configs).toContainEqual(expect.objectContaining({ tenantId: 'tenant-id-a' }));
    expect(configs).toContainEqual(expect.objectContaining({ tenantId: 'tenant-id-b' }));
  });

  it('reuses the same tenant\'s cached client across separate scoped calls', async () => {
    const a1 = await runWithCredentials(creds('a'), () => getClient());
    const a2 = await runWithCredentials(creds('a'), () => getClient());

    expect(a1).toBe(a2);
    expect(mocks.instances).toHaveLength(1);
  });
});

describe('testConnection', () => {
  it('returns true when getClient succeeds and the connection is authenticated', async () => {
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = 'acme';
    process.env.IMMYBOT_TENANT_ID = 't-1';
    process.env.IMMYBOT_CLIENT_ID = 'c-1';
    process.env.IMMYBOT_CLIENT_SECRET = 's-1';

    await expect(testConnection()).resolves.toBe(true);
  });

  it('returns false when no credentials are configured', async () => {
    await expect(testConnection()).resolves.toBe(false);
  });
});

describe('resetClient', () => {
  it('clears the client cache, forcing a rebuild on the next call', async () => {
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = 'acme';
    process.env.IMMYBOT_TENANT_ID = 't-1';
    process.env.IMMYBOT_CLIENT_ID = 'c-1';
    process.env.IMMYBOT_CLIENT_SECRET = 's-1';

    const first = await getClient();
    resetClient();
    const second = await getClient();

    expect(second).not.toBe(first);
    expect(mocks.instances).toHaveLength(2);
  });
});
