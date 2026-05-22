import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';

/**
 * Tenants domain handler for client organization management (read-only)
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_tenants_list',
      description: 'List client organizations/tenants with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search by tenant name',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Suspended'],
            description: 'Filter by tenant status',
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
      name: 'immybot_tenants_get',
      description: 'Get details for a specific tenant by ID',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tenants_search',
      description: 'Search tenants by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (tenant name)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'immybot_tenants_stats',
      description: 'Get statistics for a tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tenants_computers',
      description: 'Get computers for a specific tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tenants_deployments',
      description: 'Get deployments for a specific tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tenants_compliance',
      description: 'Get compliance dashboard data for a tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
    {
      name: 'immybot_tenants_software_inventory',
      description: 'Get software inventory for a tenant',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Tenant ID',
          },
        },
        required: ['tenantId'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Tenants tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_tenants_list': {
        const tenants = await client.tenants.list(args as any) as any[];

        const summary = `Found ${tenants.length} tenants`;
        const detailedList = tenants.map(tenant =>
          `• ${tenant.name} (ID: ${tenant.id})\n` +
          `  Status: ${tenant.status} | Type: ${tenant.type || 'Standard'}\n` +
          `  Contact: ${tenant.primaryContact || 'Not set'}\n` +
          `  Created: ${tenant.createdAt}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_tenants_get': {
        const tenantId = args.tenantId as number;
        const tenant = await client.tenants.get(tenantId) as any;

        const details = [
          `Tenant: ${tenant.name} (ID: ${tenant.id})`,
          `Status: ${tenant.status}`,
          `Type: ${tenant.type || 'Standard'}`,
          `Primary Contact: ${tenant.primaryContact || 'Not set'}`,
          `Email: ${tenant.email || 'Not set'}`,
          `Phone: ${tenant.phone || 'Not set'}`,
          `Address: ${tenant.address || 'Not set'}`,
          `Time Zone: ${tenant.timeZone || 'Not set'}`,
          `Website: ${tenant.website || 'Not set'}`,
          `Description: ${tenant.description || 'No description'}`,
          `Created: ${tenant.createdAt}`,
          `Updated: ${tenant.updatedAt}`,
          `Last Activity: ${tenant.lastActivity || 'Unknown'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tenants_search': {
        const query = args.query as string;
        const tenants = await client.tenants.search(query);

        if (tenants.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tenants found matching "${query}"`
            }],
          };
        }

        const results = tenants.map(tenant =>
          `• ${tenant.name} (ID: ${tenant.id}) - ${tenant.status} - ${tenant.type || 'Standard'}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${tenants.length} tenants matching "${query}":\n\n${results}`
          }],
        };
      }

      case 'immybot_tenants_stats': {
        const tenantId = args.tenantId as number;
        const stats = await client.tenants.getStats(tenantId);

        const details = [
          `Statistics for Tenant ID ${tenantId}:`,
          `• Total Computers: ${stats.computerCount}`,
          `• Active Computers: ${stats.activeComputerCount}`,
          `• Software Packages: ${stats.softwareCount}`,
          `• Deployments: ${stats.deploymentCount}`,
          `• Last Maintenance Session: ${stats.lastMaintenanceSession || 'Never'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tenants_computers': {
        const tenantId = args.tenantId as number;
        const computers = await client.tenants.getComputers(tenantId);

        if (computers.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No computers found for tenant ID ${tenantId}`
            }],
          };
        }

        const computerList = computers.map(computer =>
          `• ${computer.name} (ID: ${computer.id})\n` +
          `  Status: ${computer.status} | Online: ${computer.isOnline ? 'Yes' : 'No'}\n` +
          `  OS: ${computer.operatingSystem} | Last Seen: ${computer.lastSeen || 'Never'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Computers for tenant ID ${tenantId}:\n\n${computerList}`
          }],
        };
      }

      case 'immybot_tenants_deployments': {
        const tenantId = args.tenantId as number;
        const deployments = await client.tenants.getDeployments(tenantId);

        if (deployments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No deployments found for tenant ID ${tenantId}`
            }],
          };
        }

        const deploymentList = deployments.map(deployment =>
          `• ${deployment.name} (ID: ${deployment.id})\n` +
          `  Software: ${deployment.softwareId} | State: ${deployment.desiredState}\n` +
          `  Status: ${deployment.status} | Auto-update: ${deployment.autoUpdate ? 'Yes' : 'No'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Deployments for tenant ID ${tenantId}:\n\n${deploymentList}`
          }],
        };
      }

      case 'immybot_tenants_compliance': {
        const tenantId = args.tenantId as number;
        const compliance = await client.tenants.getComplianceDashboard(tenantId);

        const details = [
          `Compliance Dashboard for Tenant ID ${tenantId}:`,
          `• Total Computers: ${compliance.totalComputers}`,
          `• Compliant Computers: ${compliance.compliantComputers}`,
          `• Non-Compliant Computers: ${compliance.nonCompliantComputers}`,
          `• Compliance Percentage: ${compliance.compliancePercentage}%`,
          ``,
          `Top Non-Compliant Software:`,
          ...compliance.topNonCompliantSoftware.map(software =>
            `• ${software.softwareName}: ${software.nonCompliantCount} computers`
          ),
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_tenants_software_inventory': {
        const tenantId = args.tenantId as number;
        const inventory = await client.tenants.getSoftwareInventory(tenantId);

        if (inventory.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No software inventory found for tenant ID ${tenantId}`
            }],
          };
        }

        const inventoryList = inventory.map(item =>
          `• ${item.softwareName} ${item.version || ''}\n` +
          `  Publisher: ${item.publisher || 'Unknown'} | Installed on: ${item.installCount} computers\n` +
          `  Last Seen: ${item.lastSeen}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Software inventory for tenant ID ${tenantId}:\n\n${inventoryList}`
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tenants tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Tenants tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const tenantsHandler: DomainHandler = { getTools, handleCall };