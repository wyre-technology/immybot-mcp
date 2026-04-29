import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { elicitSelection, elicitConfirmation } from '../utils/elicitation.js';

/**
 * Software domain handler for application and package management
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_software_list_global',
      description: 'List global software packages available to all tenants',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by software category',
          },
          publisher: {
            type: 'string',
            description: 'Filter by publisher',
          },
          search: {
            type: 'string',
            description: 'Search by software name',
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
      name: 'immybot_software_list',
      description: 'List all software packages (global and tenant-specific)',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by software category',
          },
          publisher: {
            type: 'string',
            description: 'Filter by publisher',
          },
          search: {
            type: 'string',
            description: 'Search by software name',
          },
          isGlobal: {
            type: 'boolean',
            description: 'Filter by global availability',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Pending', 'Error', 'Disabled'],
            description: 'Filter by software status',
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
      name: 'immybot_software_get',
      description: 'Get details for a specific software package by ID',
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
    {
      name: 'immybot_software_search',
      description: 'Search software packages by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (software name)',
          },
          category: {
            type: 'string',
            description: 'Limit search to specific category',
          },
          publisher: {
            type: 'string',
            description: 'Limit search to specific publisher',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'immybot_software_versions',
      description: 'List versions for a specific software package',
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
    {
      name: 'immybot_software_latest_version',
      description: 'Get the latest version of a software package',
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
    {
      name: 'immybot_software_categories',
      description: 'Get list of software categories',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_software_publishers',
      description: 'Get list of software publishers',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_software_install',
      description: 'Install software on computers (stages desired state for maintenance session reconciliation)',
      inputSchema: {
        type: 'object',
        properties: {
          softwareId: {
            type: 'number',
            description: 'Software package ID to install',
          },
          computerIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Computer IDs to install software on',
          },
          tenantId: {
            type: 'number',
            description: 'Install on all computers in this tenant (alternative to computerIds)',
          },
          autoUpdate: {
            type: 'boolean',
            description: 'Enable automatic updates',
            default: false,
          },
        },
        required: ['softwareId'],
      },
    },
    {
      name: 'immybot_software_stats',
      description: 'Get installation statistics for a software package',
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
  logger.debug('Software tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_software_list_global': {
        const software = await client.software.listGlobal(args as any);

        const summary = `Found ${software.length} global software packages`;
        const detailedList = software.map(sw =>
          `• ${sw.displayName || sw.name} (ID: ${sw.id})\n` +
          `  Publisher: ${sw.publisher || 'Unknown'} | Category: ${sw.category || 'Uncategorized'}\n` +
          `  Status: ${sw.status} | Install Method: ${sw.installationMethod}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_software_list': {
        const software = await client.software.list(args as any);

        const summary = `Found ${software.length} software packages`;
        const detailedList = software.map(sw =>
          `• ${sw.displayName || sw.name} (ID: ${sw.id})\n` +
          `  Publisher: ${sw.publisher || 'Unknown'} | Category: ${sw.category || 'Uncategorized'}\n` +
          `  Status: ${sw.status} | Global: ${sw.isGlobal ? 'Yes' : 'No'} | Install Method: ${sw.installationMethod}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_software_get': {
        const softwareId = args.softwareId as number;
        const software = await client.software.get(softwareId);

        const details = [
          `Software: ${software.displayName || software.name} (ID: ${software.id})`,
          `Publisher: ${software.publisher || 'Unknown'}`,
          `Category: ${software.category || 'Uncategorized'}`,
          `Status: ${software.status}`,
          `Global: ${software.isGlobal ? 'Yes' : 'No'}`,
          `Installation Method: ${software.installationMethod}`,
          `Uninstall Method: ${software.uninstallMethod}`,
          `Requires Reboot: ${software.requiresReboot ? 'Yes' : 'No'}`,
          `Architecture: ${software.architecture || 'Any'}`,
          `Minimum OS Version: ${software.minimumOsVersion || 'Not specified'}`,
          `Maximum OS Version: ${software.maximumOsVersion || 'Not specified'}`,
          `Description: ${software.description || 'No description'}`,
          `Website: ${software.websiteUrl || 'Not provided'}`,
          `Support URL: ${software.supportUrl || 'Not provided'}`,
          `Created: ${software.createdAt}`,
          `Updated: ${software.updatedAt}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_software_search': {
        const query = args.query as string;
        const software = await client.software.search(query, args as any);

        if (software.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No software found matching "${query}"`
            }],
          };
        }

        // If multiple results, offer selection
        if (software.length > 1) {
          const options = software.map(sw => ({
            label: `${sw.displayName || sw.name} (${sw.publisher || 'Unknown publisher'})`,
            value: sw.id,
          }));

          const selection = await elicitSelection(
            `Found ${software.length} software packages matching "${query}". Which would you like to see details for?`,
            options
          );

          if (selection === null) {
            // Show list instead of details
            const results = software.map(sw =>
              `• ${sw.displayName || sw.name} (ID: ${sw.id}) - ${sw.publisher || 'Unknown'} - ${sw.status}`
            ).join('\n');

            return {
              content: [{
                type: 'text',
                text: `Found ${software.length} software packages matching "${query}":\n\n${results}\n\nUse immybot_software_get with a specific ID for detailed information.`
              }],
            };
          }
        }

        const results = software.map(sw =>
          `• ${sw.displayName || sw.name} (ID: ${sw.id}) - ${sw.publisher || 'Unknown'} - ${sw.status}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${software.length} software packages matching "${query}":\n\n${results}`
          }],
        };
      }

      case 'immybot_software_versions': {
        const softwareId = args.softwareId as number;
        const versions = await client.software.listVersions(softwareId);

        if (versions.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No versions found for software ID ${softwareId}`
            }],
          };
        }

        const versionList = versions.map(version =>
          `• Version ${version.version} ${version.isLatest ? '(Latest)' : ''}\n` +
          `  Display Version: ${version.displayVersion || 'Same as version'}\n` +
          `  Status: ${version.status} | Released: ${version.releaseDate || 'Unknown'}\n` +
          `  Download: ${version.downloadUrl ? 'Available' : 'Not available'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Versions for software ID ${softwareId}:\n\n${versionList}`
          }],
        };
      }

      case 'immybot_software_latest_version': {
        const softwareId = args.softwareId as number;
        const version = await client.software.getLatestVersion(softwareId);

        const details = [
          `Latest Version: ${version.version}`,
          `Display Version: ${version.displayVersion || 'Same as version'}`,
          `Status: ${version.status}`,
          `Release Date: ${version.releaseDate || 'Unknown'}`,
          `Download URL: ${version.downloadUrl ? 'Available' : 'Not available'}`,
          `Install Parameters: ${version.installParameters || 'Default'}`,
          `Uninstall Parameters: ${version.uninstallParameters || 'Default'}`,
          `Release Notes: ${version.releaseNotes || 'No release notes'}`,
        ].join('\n');

        return {
          content: [{
            type: 'text',
            text: `Latest version for software ID ${softwareId}:\n\n${details}`
          }],
        };
      }

      case 'immybot_software_categories': {
        const categories = await client.software.getCategories();

        return {
          content: [{
            type: 'text',
            text: `Available software categories:\n\n${categories.map(cat => `• ${cat}`).join('\n')}`
          }],
        };
      }

      case 'immybot_software_publishers': {
        const publishers = await client.software.getPublishers();

        return {
          content: [{
            type: 'text',
            text: `Available software publishers:\n\n${publishers.map(pub => `• ${pub}`).join('\n')}`
          }],
        };
      }

      case 'immybot_software_install': {
        const softwareId = args.softwareId as number;
        const computerIds = args.computerIds as number[] | undefined;
        const tenantId = args.tenantId as number | undefined;

        if (!computerIds && !tenantId) {
          return {
            content: [{
              type: 'text',
              text: 'Either computerIds or tenantId must be specified to install software'
            }],
            isError: true,
          };
        }

        // Get software name for confirmation
        const software = await client.software.get(softwareId);
        const target = computerIds ? `${computerIds.length} computers` : `all computers in tenant ${tenantId}`;

        // Elicit confirmation for software installation
        const confirmed = await elicitConfirmation(
          `Install "${software.displayName || software.name}" on ${target}`,
          `This will stage the software for installation during the next maintenance session. The software will not be installed immediately - a maintenance session must run to reconcile the desired state.`,
          'medium'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ CONFIRMATION REQUIRED: Install "${software.displayName || software.name}" on ${target}?\n\nThis will stage the software for installation during the next maintenance session. The software will not be installed immediately - a maintenance session must run to reconcile the desired state.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        // Create deployments
        let deployments;
        if (computerIds) {
          deployments = await Promise.all(
            computerIds.map(computerId =>
              client.deployments.targetComputer({
                softwareId,
                computerId,
                desiredState: 'Installed',
                autoUpdate: args.autoUpdate as boolean || false,
              })
            )
          );
        } else if (tenantId) {
          deployments = [await client.deployments.targetTenant({
            softwareId,
            tenantId,
            desiredState: 'Installed',
            autoUpdate: args.autoUpdate as boolean || false,
          })];
        }

        const deploymentIds = deployments!.map(d => d.id).join(', ');

        return {
          content: [{
            type: 'text',
            text: `✅ Staged "${software.displayName || software.name}" for installation on ${target}.\n\nDeployment IDs: ${deploymentIds}\n\n⏳ Note: Software will be installed during the next maintenance session. Use immybot_maintenance_sessions_start to trigger reconciliation immediately.`
          }],
        };
      }

      case 'immybot_software_stats': {
        const softwareId = args.softwareId as number;
        const stats = await client.software.getInstallationStats(softwareId);

        return {
          content: [{
            type: 'text',
            text: `Installation statistics for software ID ${softwareId}:\n\n${JSON.stringify(stats, null, 2)}`
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown software tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Software tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const softwareHandler: DomainHandler = { getTools, handleCall };