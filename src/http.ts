import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';
import { runWithCredentials, type Credentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import { verifyS2sHeader, S2S_HEADER } from './s2s-verify.js';

/**
 * HTTP transport for MCP server
 * Creates per-request server instances for stateless operation (required for gateway mode)
 */

// Conduit service-to-service auth (gateway#377 parity). Non-empty =
// enforce X-Gateway-S2S on every /mcp request; empty = disabled, behavior
// exactly as before (dark-by-default until the gateway provisions this
// container's derived subkey). See src/s2s-verify.ts.
const S2S_SECRET = process.env.CONDUIT_S2S_SECRET || '';

/**
 * Extract gateway-injected credentials from headers. Returns null if any
 * required header is missing — does NOT mutate process.env; credentials are
 * bound per-request via AsyncLocalStorage in handleMcpRequest below.
 */
function extractCredentialsFromHeaders(req: IncomingMessage): Credentials | null {
  const instanceSubdomain = req.headers['x-immybot-instance-subdomain'] as string | undefined;
  const tenantId = req.headers['x-immybot-tenant-id'] as string | undefined;
  const clientId = req.headers['x-immybot-client-id'] as string | undefined;
  const clientSecret = req.headers['x-immybot-client-secret'] as string | undefined;

  logger.debug('Extracted credentials from headers', {
    hasInstanceSubdomain: !!instanceSubdomain,
    hasTenantId: !!tenantId,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
  });

  if (!instanceSubdomain || !tenantId || !clientId || !clientSecret) {
    return null;
  }
  return { instanceSubdomain, tenantId, clientId, clientSecret };
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Create fresh server and transport per request (CRITICAL for gateway mode)
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // STATELESS
      enableJsonResponse: true,
    });

    // Clean up when response finishes
    res.on('close', () => {
      logger.debug('Response closed, cleaning up');
      transport.close();
      server.close();
    });

    // Connect server to transport and handle request
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error: any) {
    logger.error('MCP transport error', { error: error.message, stack: error.stack });

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message,
        },
        id: null
      }));
    }
  }
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  logger.debug('MCP request received', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers || {}),
  });

  // Gateway mode: bind this request's credentials to an AsyncLocalStorage
  // context instead of writing them to process.env — under concurrent
  // multi-tenant load, a shared process-global would let one tenant's
  // in-flight request observe another tenant's credentials. Missing headers
  // are not rejected here (tools/list must still work); getClient() throws a
  // clear error on tools/call instead.
  if (process.env.AUTH_MODE === 'gateway') {
    const creds = extractCredentialsFromHeaders(req);
    if (creds) {
      await runWithCredentials(creds, () => handleMcp(req, res));
      return;
    }
  }

  await handleMcp(req, res);
}

export function createHttpServer() {
  const server = createServer(async (req, res) => {
    // CORS headers for browser clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-immybot-instance-subdomain, x-immybot-tenant-id, x-immybot-client-id, x-immybot-client-secret');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mcp') {
      // Conduit service-to-service auth (gateway#377 parity): rejected
      // BEFORE any credential extraction, mirroring every other ported
      // wrapper (e.g. containers/sentinelone-mcp/gateway_wrapper.py).
      if (S2S_SECRET && !verifyS2sHeader(req.headers[S2S_HEADER] as string | undefined, S2S_SECRET)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Missing or invalid X-Gateway-S2S header: this endpoint only accepts requests signed by the gateway.',
          })
        );
        return;
      }
      await handleMcpRequest(req, res);
    } else if (req.method === 'GET' && req.url === '/health') {
      // Health check endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'immybot-mcp',
        timestamp: new Date().toISOString(),
      }));
    } else {
      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not found',
        message: 'POST /mcp for MCP protocol, GET /health for health check',
      }));
    }
  });

  server.on('error', (error) => {
    logger.error('HTTP server error', { error: error.message });
  });

  return server;
}