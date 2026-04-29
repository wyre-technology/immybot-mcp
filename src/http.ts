import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import { createMcpServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * HTTP transport for MCP server
 * Creates per-request server instances for stateless operation (required for gateway mode)
 */

function extractCredentialsFromHeaders(req: IncomingMessage): void {
  // Extract gateway-injected credentials from headers
  const instanceSubdomain = req.headers['x-immybot-instance-subdomain'] as string;
  const tenantId = req.headers['x-immybot-tenant-id'] as string;
  const clientId = req.headers['x-immybot-client-id'] as string;
  const clientSecret = req.headers['x-immybot-client-secret'] as string;

  // Set environment variables for client.ts to pick up
  if (instanceSubdomain) process.env.X_IMMYBOT_INSTANCE_SUBDOMAIN = instanceSubdomain;
  if (tenantId) process.env.X_IMMYBOT_TENANT_ID = tenantId;
  if (clientId) process.env.X_IMMYBOT_CLIENT_ID = clientId;
  if (clientSecret) process.env.X_IMMYBOT_CLIENT_SECRET = clientSecret;

  logger.debug('Extracted credentials from headers', {
    hasInstanceSubdomain: !!instanceSubdomain,
    hasTenantId: !!tenantId,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
  });
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  logger.debug('MCP request received', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers || {}),
  });

  try {
    // Extract credentials from headers (gateway mode)
    if (process.env.AUTH_MODE === 'gateway') {
      extractCredentialsFromHeaders(req);
    }

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