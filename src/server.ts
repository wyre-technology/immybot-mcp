import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getAvailableTools, handleToolCall } from './domains/index.js';
import { setServerRef, clearServerRef } from './utils/server-ref.js';
import { logger } from './utils/logger.js';

/**
 * Create MCP server instance
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'immybot-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Set server reference for elicitation
  setServerRef(server);

  // Tool list handler
  server.setRequestHandler('tools/list', async () => {
    try {
      const tools = await getAvailableTools();
      logger.debug('Tools listed', { toolCount: tools.length });

      return { tools };
    } catch (error: any) {
      logger.error('Error listing tools', { error: error.message });
      throw error;
    }
  });

  // Tool call handler
  server.setRequestHandler('tools/call', async (request) => {
    try {
      const { name, arguments: args } = CallToolRequestSchema.parse(request.params);
      logger.debug('Tool called', { toolName: name, args });

      const result = await handleToolCall(name, args || {});
      logger.debug('Tool completed', { toolName: name, hasError: result.isError });

      return result;
    } catch (error: any) {
      logger.error('Error calling tool', { error: error.message, stack: error.stack });

      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error.message}`
        }],
        isError: true,
      };
    }
  });

  // Cleanup handler
  server.onclose = () => {
    logger.debug('Server closing');
    clearServerRef();
  };

  logger.debug('MCP server created');

  return server;
}

/**
 * Send tool list changed notification
 * Used after navigation state changes to update available tools
 */
export function notifyToolListChanged(server: Server): void {
  try {
    server.sendToolListChanged();
    logger.debug('Tool list changed notification sent');
  } catch (error: any) {
    logger.warn('Failed to send tool list changed notification', { error: error.message });
  }
}