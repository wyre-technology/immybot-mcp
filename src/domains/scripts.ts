import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { elicitConfirmation } from '../utils/elicitation.js';

/**
 * Scripts domain handler for PowerShell script execution and management
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_scripts_list',
      description: 'List PowerShell scripts with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by script category',
          },
          isGlobal: {
            type: 'boolean',
            description: 'Filter by global availability',
          },
          search: {
            type: 'string',
            description: 'Search by script name',
          },
          language: {
            type: 'string',
            description: 'Filter by script language (e.g., PowerShell)',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Draft'],
            description: 'Filter by script status',
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
      name: 'immybot_scripts_get',
      description: 'Get details for a specific script by ID',
      inputSchema: {
        type: 'object',
        properties: {
          scriptId: {
            type: 'number',
            description: 'Script ID',
          },
        },
        required: ['scriptId'],
      },
    },
    {
      name: 'immybot_scripts_search',
      description: 'Search scripts by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (script name)',
          },
          category: {
            type: 'string',
            description: 'Limit search to specific category',
          },
          isGlobal: {
            type: 'boolean',
            description: 'Include only global scripts',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'immybot_scripts_run',
      description: 'Execute a script on a computer (DESTRUCTIVE - runs in SYSTEM context)',
      inputSchema: {
        type: 'object',
        properties: {
          scriptId: {
            type: 'number',
            description: 'Script ID to execute',
          },
          computerId: {
            type: 'number',
            description: 'Target computer ID',
          },
          parameters: {
            type: 'object',
            description: 'Script parameters (optional)',
            additionalProperties: true,
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in minutes (default: 30)',
            default: 30,
          },
          runAs: {
            type: 'string',
            enum: ['System', 'User'],
            description: 'Execution context (default: System)',
            default: 'System',
          },
        },
        required: ['scriptId', 'computerId'],
      },
    },
    {
      name: 'immybot_scripts_categories',
      description: 'Get list of script categories',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_scripts_execution_history',
      description: 'Get script execution history for a computer',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Computer ID',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results (default: 50)',
            default: 50,
          },
        },
        required: ['computerId'],
      },
    },
    {
      name: 'immybot_scripts_execution_result',
      description: 'Get results of a specific script execution',
      inputSchema: {
        type: 'object',
        properties: {
          scriptId: {
            type: 'number',
            description: 'Script ID',
          },
          executionId: {
            type: 'number',
            description: 'Execution ID',
          },
        },
        required: ['scriptId', 'executionId'],
      },
    },
    {
      name: 'immybot_scripts_validate',
      description: 'Validate script syntax',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Script content to validate',
          },
          language: {
            type: 'string',
            description: 'Script language (default: PowerShell)',
            default: 'PowerShell',
          },
        },
        required: ['content'],
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Scripts tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_scripts_list': {
        const scripts = await client.scripts.list(args as any);

        const summary = `Found ${scripts.length} scripts`;
        const detailedList = scripts.map(script =>
          `• ${script.name} (ID: ${script.id})\n` +
          `  Category: ${script.category || 'Uncategorized'} | Language: ${script.language || 'PowerShell'}\n` +
          `  Status: ${script.status} | Global: ${script.isGlobal ? 'Yes' : 'No'}\n` +
          `  Description: ${script.description || 'No description'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_scripts_get': {
        const scriptId = args.scriptId as number;
        const script = await client.scripts.get(scriptId);

        const details = [
          `Script: ${script.name} (ID: ${script.id})`,
          `Category: ${script.category || 'Uncategorized'}`,
          `Language: ${script.language || 'PowerShell'}`,
          `Status: ${script.status}`,
          `Global: ${script.isGlobal ? 'Yes' : 'No'}`,
          `Description: ${script.description || 'No description'}`,
          `Parameters: ${script.parameters ? JSON.stringify(script.parameters) : 'None'}`,
          `Execution Timeout: ${script.timeoutMinutes || 'Default'} minutes`,
          `Created: ${script.createdAt}`,
          `Updated: ${script.updatedAt}`,
          `Content Preview: ${script.content ? script.content.substring(0, 200) + (script.content.length > 200 ? '...' : '') : 'No content'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_scripts_search': {
        const query = args.query as string;
        const scripts = await client.scripts.search(query, args as any);

        if (scripts.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No scripts found matching "${query}"`
            }],
          };
        }

        const results = scripts.map(script =>
          `• ${script.name} (ID: ${script.id}) - ${script.category || 'Uncategorized'} - ${script.status}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${scripts.length} scripts matching "${query}":\n\n${results}`
          }],
        };
      }

      case 'immybot_scripts_run': {
        const scriptId = args.scriptId as number;
        const computerId = args.computerId as number;

        // Get script and computer details for confirmation
        const [script, computer] = await Promise.all([
          client.scripts.get(scriptId),
          client.computers.get(computerId)
        ]);

        // This is VERY destructive - require explicit confirmation with script name
        const confirmed = await elicitConfirmation(
          `Execute script "${script.name}" on computer "${computer.name}"`,
          `⚠️ WARNING: This will run PowerShell script "${script.name}" in SYSTEM context on ${computer.name}. Scripts can install/uninstall software, modify system settings, access files, and potentially reboot the computer. This is a highly privileged and potentially destructive operation.\n\nScript description: ${script.description || 'No description provided'}\n\nOnly proceed if you understand the script's purpose and trust its safety.`,
          'high'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `🚨 CONFIRMATION REQUIRED: Execute script "${script.name}" on computer "${computer.name}"?\n\n⚠️ WARNING: This will run PowerShell script "${script.name}" in SYSTEM context on ${computer.name}. Scripts can install/uninstall software, modify system settings, access files, and potentially reboot the computer. This is a highly privileged and potentially destructive operation.\n\nScript description: ${script.description || 'No description provided'}\n\nOnly proceed if you understand the script's purpose and trust its safety.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        const execution = await client.scripts.executeOnComputer(scriptId, {
          computerId,
          parameters: args.parameters as any,
          timeoutMinutes: args.timeout as number,
          runAs: args.runAs as any,
        } as any);

        return {
          content: [{
            type: 'text',
            text: `✅ Started execution of script "${script.name}" on computer "${computer.name}".\n\nExecution ID: ${execution.id}\nStatus: ${execution.status}\n\n⏳ Use immybot_scripts_execution_result with script ID ${scriptId} and execution ID ${execution.id} to check the results.`
          }],
        };
      }

      case 'immybot_scripts_categories': {
        const categories = await client.scripts.getCategories();

        return {
          content: [{
            type: 'text',
            text: `Available script categories:\n\n${categories.map(cat => `• ${cat}`).join('\n')}`
          }],
        };
      }

      case 'immybot_scripts_execution_history': {
        const computerId = args.computerId as number;
        const executions = await client.scripts.getExecutionHistoryForComputer(computerId) as any[];

        if (executions.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No script executions found for computer ID ${computerId}`
            }],
          };
        }

        const executionList = executions.map(execution =>
          `• Execution ID ${execution.id}: Script ${execution.scriptId}\n` +
          `  Status: ${execution.status} | Started: ${execution.startedAt}\n` +
          `  Completed: ${execution.completedAt || 'Still running'}\n` +
          `  Exit Code: ${execution.exitCode !== undefined ? execution.exitCode : 'N/A'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Script execution history for computer ID ${computerId}:\n\n${executionList}`
          }],
        };
      }

      case 'immybot_scripts_execution_result': {
        const scriptId = args.scriptId as number;
        const executionId = args.executionId as number;
        const result = await client.scripts.getExecutionResult(scriptId, executionId) as any;

        const details = [
          `Script Execution Result (ID: ${result.id})`,
          `Script ID: ${result.scriptId}`,
          `Computer ID: ${result.computerId}`,
          `Status: ${result.status}`,
          `Started: ${result.startedAt}`,
          `Completed: ${result.completedAt || 'Still running'}`,
          `Duration: ${result.duration || 'N/A'}`,
          `Exit Code: ${result.exitCode !== undefined ? result.exitCode : 'N/A'}`,
          `Output: ${result.output || 'No output'}`,
          `Error: ${result.error || 'No errors'}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_scripts_validate': {
        const content = args.content as string;
        const language = args.language as string || 'PowerShell';

        const validation = await client.scripts.validateSyntax(content, language);

        if (validation.valid) {
          return {
            content: [{
              type: 'text',
              text: `✅ Script syntax is valid for ${language}.`
            }],
          };
        } else {
          const errors = validation.errors?.join('\n• ') || 'Unknown syntax errors';
          return {
            content: [{
              type: 'text',
              text: `❌ Script syntax validation failed for ${language}:\n\n• ${errors}`
            }],
          };
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown scripts tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Scripts tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const scriptsHandler: DomainHandler = { getTools, handleCall };