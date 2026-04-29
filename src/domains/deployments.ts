import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { elicitConfirmation } from '../utils/elicitation.js';

/**
 * Deployments domain handler for software deployment configuration
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_deployments_list',
      description: 'List deployment configurations with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          targetType: {
            type: 'string',
            enum: ['Computer', 'Tenant', 'Group'],
            description: 'Filter by deployment target type',
          },
          targetId: {
            type: 'number',
            description: 'Filter by target ID',
          },
          softwareId: {
            type: 'number',
            description: 'Filter by software package ID',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Pending', 'Error'],
            description: 'Filter by deployment status',
          },
          desiredState: {
            type: 'string',
            enum: ['Installed', 'Uninstalled', 'Updated'],
            description: 'Filter by desired state',
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
      name: 'immybot_deployments_get',
      description: 'Get details for a specific deployment by ID',
      inputSchema: {
        type: 'object',
        properties: {
          deploymentId: {
            type: 'number',
            description: 'Deployment ID',
          },
        },
        required: ['deploymentId'],
      },
    },
    {
      name: 'immybot_deployments_create',
      description: 'Create a new deployment configuration to stage desired state',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Deployment name',
          },
          softwareId: {
            type: 'number',
            description: 'Software package ID to deploy',
          },
          targetType: {
            type: 'string',
            enum: ['Computer', 'Tenant', 'Group'],
            description: 'Target type for deployment',
          },
          targetId: {
            type: 'number',
            description: 'Target ID (computer/tenant/group ID)',
          },
          desiredState: {
            type: 'string',
            enum: ['Installed', 'Uninstalled', 'Updated'],
            description: 'Desired software state',
          },
          autoUpdate: {
            type: 'boolean',
            description: 'Enable automatic updates for this deployment',
            default: false,
          },
          description: {
            type: 'string',
            description: 'Deployment description (optional)',
          },
        },
        required: ['name', 'softwareId', 'targetType', 'targetId', 'desiredState'],
      },
    },
    {
      name: 'immybot_deployments_trigger',
      description: 'Trigger deployment execution (stages for next maintenance session)',
      inputSchema: {
        type: 'object',
        properties: {
          deploymentId: {
            type: 'number',
            description: 'Deployment ID to trigger',
          },
        },
        required: ['deploymentId'],
      },
    },
    {
      name: 'immybot_deployments_compliance',
      description: 'Get compliance status for a deployment',
      inputSchema: {
        type: 'object',
        properties: {
          deploymentId: {
            type: 'number',
            description: 'Deployment ID',
          },
        },
        required: ['deploymentId'],
      },
    },
    {
      name: 'immybot_deployments_for_computer',
      description: 'Get all deployments targeting a specific computer',
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
      name: 'immybot_deployments_for_software',
      description: 'Get all deployments for a specific software package',
      inputSchema: {
        type: 'object',
        properties: {
          softwareId: {
            type: 'number',
            description: 'Software package ID',
          },
        },
        required: ['softwareId'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Deployments tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_deployments_list': {
        const deployments = await client.deployments.list(args as any);

        const summary = `Found ${deployments.length} deployments`;
        const detailedList = deployments.map(deployment =>
          `• ${deployment.name} (ID: ${deployment.id})\n` +
          `  Software: ${deployment.softwareId} | Target: ${deployment.targetType} ${deployment.targetId}\n` +
          `  State: ${deployment.desiredState} | Status: ${deployment.status}\n` +
          `  Auto-update: ${deployment.autoUpdate ? 'Yes' : 'No'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_deployments_get': {
        const deploymentId = args.deploymentId as number;
        const deployment = await client.deployments.get(deploymentId);

        const details = [
          `Deployment: ${deployment.name} (ID: ${deployment.id})`,
          `Software ID: ${deployment.softwareId}`,
          `Target: ${deployment.targetType} ${deployment.targetId}`,
          `Desired State: ${deployment.desiredState}`,
          `Status: ${deployment.status}`,
          `Auto-update: ${deployment.autoUpdate ? 'Yes' : 'No'}`,
          `Description: ${deployment.description || 'No description'}`,
          `Created: ${deployment.createdAt}`,
          `Updated: ${deployment.updatedAt}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_deployments_create': {
        // This is a destructive operation that changes system state
        const softwareId = args.softwareId as number;
        const targetType = args.targetType as string;
        const targetId = args.targetId as number;
        const desiredState = args.desiredState as string;
        const name = args.name as string;

        const confirmed = await elicitConfirmation(
          `Create deployment "${name}" for software ${softwareId}`,
          `This will create a deployment to set software ${softwareId} to "${desiredState}" state on ${targetType} ${targetId}. The deployment will be staged for execution during the next maintenance session.`,
          'medium'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ CONFIRMATION REQUIRED: Create deployment "${name}" for software ${softwareId}?\n\nThis will create a deployment to set software ${softwareId} to "${desiredState}" state on ${targetType} ${targetId}. The deployment will be staged for execution during the next maintenance session.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        const deployment = await client.deployments.create(args as any);

        return {
          content: [{
            type: 'text',
            text: `✅ Created deployment "${deployment.name}" with ID ${deployment.id}.\n\n⏳ Note: This deployment is staged for execution during the next maintenance session. Use immybot_maintenance_sessions_start to trigger reconciliation immediately.`
          }],
        };
      }

      case 'immybot_deployments_trigger': {
        const deploymentId = args.deploymentId as number;

        // Get deployment details for confirmation
        const deployment = await client.deployments.get(deploymentId);

        const confirmed = await elicitConfirmation(
          `Trigger deployment "${deployment.name}"`,
          `This will stage deployment ${deploymentId} for execution during the next maintenance session. It does not trigger an immediate reconciliation.`,
          'medium'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ CONFIRMATION REQUIRED: Trigger deployment "${deployment.name}"?\n\nThis will stage deployment ${deploymentId} for execution during the next maintenance session. It does not trigger an immediate reconciliation.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        await client.deployments.trigger(deploymentId);

        return {
          content: [{
            type: 'text',
            text: `✅ Triggered deployment "${deployment.name}" (ID: ${deploymentId}).\n\n⏳ Note: The deployment is now staged for execution. A maintenance session must run to reconcile the desired state.`
          }],
        };
      }

      case 'immybot_deployments_compliance': {
        const deploymentId = args.deploymentId as number;
        const compliance = await client.deployments.getComplianceStatus(deploymentId);

        return {
          content: [{
            type: 'text',
            text: `Compliance status for deployment ID ${deploymentId}:\n\n${JSON.stringify(compliance, null, 2)}`
          }],
        };
      }

      case 'immybot_deployments_for_computer': {
        const computerId = args.computerId as number;
        const deployments = await client.deployments.getForComputer(computerId);

        if (deployments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No deployments found for computer ID ${computerId}`
            }],
          };
        }

        const deploymentList = deployments.map(deployment =>
          `• ${deployment.name} (ID: ${deployment.id})\n` +
          `  Software: ${deployment.softwareId} | State: ${deployment.desiredState} | Status: ${deployment.status}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Deployments for computer ID ${computerId}:\n\n${deploymentList}`
          }],
        };
      }

      case 'immybot_deployments_for_software': {
        const softwareId = args.softwareId as number;
        const deployments = await client.deployments.getForSoftware(softwareId);

        if (deployments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No deployments found for software ID ${softwareId}`
            }],
          };
        }

        const deploymentList = deployments.map(deployment =>
          `• ${deployment.name} (ID: ${deployment.id})\n` +
          `  Target: ${deployment.targetType} ${deployment.targetId} | State: ${deployment.desiredState} | Status: ${deployment.status}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Deployments for software ID ${softwareId}:\n\n${deploymentList}`
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown deployments tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Deployments tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const deploymentsHandler: DomainHandler = { getTools, handleCall };