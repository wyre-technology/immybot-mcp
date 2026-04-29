import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { elicitSelection, elicitText, elicitDateRange } from '../utils/elicitation.js';

/**
 * Computers domain handler for device/endpoint management
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_computers_list',
      description: 'List computers/devices with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Filter by tenant ID',
          },
          isOnline: {
            type: 'boolean',
            description: 'Filter by online status',
          },
          operatingSystem: {
            type: 'string',
            enum: ['Windows', 'macOS', 'Linux'],
            description: 'Filter by operating system',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Pending', 'Error', 'Disabled'],
            description: 'Filter by computer status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 50)',
            default: 50,
          },
        },
      },
    },
    {
      name: 'immybot_computers_get',
      description: 'Get details for a specific computer by ID',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
        },
        required: ['computerId'],
      },
    },
    {
      name: 'immybot_computers_search',
      description: 'Search computers by name or other criteria',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (computer name, serial number, etc.)',
          },
          tenantId: {
            type: 'number',
            description: 'Limit search to specific tenant',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'immybot_computers_inventory',
      description: 'Get inventory data for a specific computer',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
        },
        required: ['computerId'],
      },
    },
    {
      name: 'immybot_computers_create',
      description: 'Create a new computer record',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Computer name',
          },
          tenantId: {
            type: 'number',
            description: 'Tenant ID this computer belongs to',
          },
          serialNumber: {
            type: 'string',
            description: 'Serial number (optional)',
          },
          macAddress: {
            type: 'string',
            description: 'MAC address (optional)',
          },
          description: {
            type: 'string',
            description: 'Description (optional)',
          },
          location: {
            type: 'string',
            description: 'Physical location (optional)',
          },
        },
        required: ['name', 'tenantId'],
      },
    },
    {
      name: 'immybot_computers_deployments',
      description: 'Get software deployments for a specific computer',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
        },
        required: ['computerId'],
      },
    },
    {
      name: 'immybot_computers_trigger_checkin',
      description: 'Trigger agent check-in for a computer',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
        },
        required: ['computerId'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Computers tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_computers_list': {
        // Elicit date range if no filters are provided
        if (!args.tenantId && !args.isOnline && !args.operatingSystem && !args.status) {
          const dateRange = await elicitDateRange('Filter computers by activity date range?');
          if (dateRange === null) {
            return {
              content: [{
                type: 'text',
                text: 'To get more relevant results, consider filtering by:\n• Tenant ID\n• Online status\n• Operating system\n• Computer status\n• Date range\n\nRunning query with no filters...'
              }],
            };
          }
        }

        const computers = await client.computers.list(args as any);

        const summary = `Found ${computers.length} computers`;
        const detailedList = computers.map(computer =>
          `• ${computer.name} (ID: ${computer.id})\n` +
          `  Status: ${computer.status} | Online: ${computer.isOnline ? 'Yes' : 'No'}\n` +
          `  OS: ${computer.operatingSystem} | Tenant: ${computer.tenantId}\n` +
          `  Last seen: ${computer.lastSeen || 'Never'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_computers_get': {
        const computerId = args.computerId as number;
        const computer = await client.computers.get(computerId);

        const details = [
          `Computer: ${computer.name} (ID: ${computer.id})`,
          `Status: ${computer.status}`,
          `Online: ${computer.isOnline ? 'Yes' : 'No'}`,
          `Operating System: ${computer.operatingSystem} ${computer.operatingSystemVersion || ''}`,
          `Tenant ID: ${computer.tenantId}`,
          `Serial Number: ${computer.serialNumber || 'Not set'}`,
          `MAC Address: ${computer.macAddress || 'Not set'}`,
          `IP Address: ${computer.ipAddress || 'Not set'}`,
          `Domain: ${computer.domain || computer.workgroup || 'Not set'}`,
          `Location: ${computer.location || 'Not set'}`,
          `Description: ${computer.description || 'Not set'}`,
          `Manufacturer: ${computer.manufacturer || 'Unknown'}`,
          `Model: ${computer.model || 'Unknown'}`,
          `Agent Version: ${computer.agentVersion || 'Not set'}`,
          `Last Seen: ${computer.lastSeen || 'Never'}`,
          `Created: ${computer.createdAt}`,
          `Updated: ${computer.updatedAt}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_computers_search': {
        const query = args.query as string;
        const computers = await client.computers.search(query, { tenantId: args.tenantId as number });

        if (computers.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No computers found matching "${query}"`
            }],
          };
        }

        const results = computers.map(computer =>
          `• ${computer.name} (ID: ${computer.id}) - ${computer.status} - ${computer.isOnline ? 'Online' : 'Offline'}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${computers.length} computers matching "${query}":\n\n${results}`
          }],
        };
      }

      case 'immybot_computers_inventory': {
        const computerId = args.computerId as number;
        const inventory = await client.computers.getInventory(computerId);

        if (inventory.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No inventory data found for computer ID ${computerId}`
            }],
          };
        }

        const inventoryList = inventory.map(item =>
          `• ${item.inventoryType}: Last collected ${item.collectedAt}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Inventory for computer ID ${computerId}:\n\n${inventoryList}`
          }],
        };
      }

      case 'immybot_computers_create': {
        const computer = await client.computers.create(args as any);

        return {
          content: [{
            type: 'text',
            text: `Created computer "${computer.name}" with ID ${computer.id} in tenant ${computer.tenantId}`
          }],
        };
      }

      case 'immybot_computers_deployments': {
        const computerId = args.computerId as number;
        const deployments = await client.computers.getDeployments(computerId);

        if (deployments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No deployments found for computer ID ${computerId}`
            }],
          };
        }

        const deploymentList = deployments.map(deployment =>
          `• Deployment ID ${deployment.id}: ${deployment.name || 'Unnamed'}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Deployments for computer ID ${computerId}:\n\n${deploymentList}`
          }],
        };
      }

      case 'immybot_computers_trigger_checkin': {
        const computerId = args.computerId as number;
        await client.computers.triggerCheckIn(computerId);

        return {
          content: [{
            type: 'text',
            text: `Triggered agent check-in for computer ID ${computerId}. The agent will contact the server within a few minutes.`
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown computers tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Computers tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const computersHandler: DomainHandler = { getTools, handleCall };