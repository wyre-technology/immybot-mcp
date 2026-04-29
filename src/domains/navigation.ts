import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, NavigationState } from '../utils/types.js';
import { logger } from '../utils/logger.js';

/**
 * Navigation domain handler for decision-tree navigation
 * Implements the mandatory navigation pattern for MCP servers
 */

let currentState: NavigationState = 'root';

function getTools(): Tool[] {
  if (currentState === 'root') {
    // Initial state: only show navigation tools
    return [
      {
        name: 'immybot_navigate',
        description: 'Navigate to a specific ImmyBot domain to access its tools',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              enum: ['computers', 'software', 'deployments', 'scripts', 'tenants', 'maintenance_sessions', 'tasks'],
              description: 'Domain to navigate to',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'immybot_status',
        description: 'Show current navigation state and available domains',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  } else {
    // In a domain: show back tool
    return [
      {
        name: 'immybot_back',
        description: 'Return to main navigation menu',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'immybot_status',
        description: 'Show current navigation state and available domains',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  logger.debug('Navigation tool called', { toolName, args, currentState });

  switch (toolName) {
    case 'immybot_navigate': {
      const domain = args.domain as string;

      if (!domain) {
        return {
          content: [{ type: 'text', text: 'Domain is required' }],
          isError: true,
        };
      }

      const validDomains = ['computers', 'software', 'deployments', 'scripts', 'tenants', 'maintenance_sessions', 'tasks'];
      if (!validDomains.includes(domain)) {
        return {
          content: [{ type: 'text', text: `Invalid domain. Available domains: ${validDomains.join(', ')}` }],
          isError: true,
        };
      }

      currentState = domain as NavigationState;
      logger.info('Navigated to domain', { domain });

      const domainDescriptions = {
        computers: 'Device and endpoint management',
        software: 'Application and package management',
        deployments: 'Software deployment configuration',
        scripts: 'PowerShell script execution and management',
        tenants: 'Client organization management',
        maintenance_sessions: 'Device maintenance and state reconciliation',
        tasks: 'Background operation monitoring',
      };

      return {
        content: [{
          type: 'text',
          text: `Navigated to ${domain} domain - ${domainDescriptions[domain]}.\n\nDomain-specific tools are now available. Use immybot_back to return to the main menu.`
        }],
      };
    }

    case 'immybot_back': {
      currentState = 'root';
      logger.info('Returned to root navigation');

      return {
        content: [{
          type: 'text',
          text: 'Returned to main navigation menu. Use immybot_navigate to access domain-specific tools.'
        }],
      };
    }

    case 'immybot_status': {
      const availableDomains = [
        '• computers - Device and endpoint management',
        '• software - Application and package management',
        '• deployments - Software deployment configuration',
        '• scripts - PowerShell script execution and management',
        '• tenants - Client organization management',
        '• maintenance_sessions - Device maintenance and state reconciliation',
        '• tasks - Background operation monitoring',
      ];

      const statusText = currentState === 'root'
        ? `🏠 Currently at: Main Navigation\n\nAvailable domains:\n${availableDomains.join('\n')}\n\nUse immybot_navigate {domain} to access domain-specific tools.`
        : `📂 Currently in: ${currentState} domain\n\nAvailable domains:\n${availableDomains.join('\n')}\n\nUse immybot_back to return to main navigation.`;

      return {
        content: [{ type: 'text', text: statusText }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown navigation tool: ${toolName}` }],
        isError: true,
      };
  }
}

export function getCurrentState(): NavigationState {
  return currentState;
}

export function setNavigationState(state: NavigationState): void {
  currentState = state;
  logger.debug('Navigation state changed', { newState: state });
}

export const navigationHandler: DomainHandler = {
  getTools,
  handleCall,
};