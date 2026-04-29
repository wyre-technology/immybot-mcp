import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult, RequestHandlerExtra } from '../utils/types.js';
import { getClient } from '../utils/client.js';
import { logger } from '../utils/logger.js';
import { elicitConfirmation } from '../utils/elicitation.js';

/**
 * Maintenance Sessions domain handler for device maintenance and state reconciliation
 */

function getTools(): Tool[] {
  return [
    {
      name: 'immybot_maintenance_sessions_list',
      description: 'List maintenance sessions with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Filter by computer ID',
          },
          tenantId: {
            type: 'number',
            description: 'Filter by tenant ID',
          },
          status: {
            type: 'string',
            enum: ['Queued', 'Running', 'Completed', 'Failed', 'Cancelled', 'Paused'],
            description: 'Filter by session status',
          },
          sessionType: {
            type: 'string',
            enum: ['Manual', 'Scheduled', 'Automated', 'Emergency'],
            description: 'Filter by session type',
          },
          startDate: {
            type: 'string',
            description: 'Filter by start date (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'Filter by end date (ISO format)',
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
      name: 'immybot_maintenance_sessions_get',
      description: 'Get details for a specific maintenance session by ID',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_start',
      description: 'Start/trigger a maintenance session to reconcile desired state (DESTRUCTIVE)',
      inputSchema: {
        type: 'object',
        properties: {
          computerId: {
            type: 'number',
            description: 'Target computer ID (for single computer)',
          },
          tenantId: {
            type: 'number',
            description: 'Target tenant ID (for all computers in tenant)',
          },
          sessionType: {
            type: 'string',
            enum: ['Manual', 'Scheduled', 'Emergency'],
            description: 'Type of maintenance session',
            default: 'Manual',
          },
          priority: {
            type: 'string',
            enum: ['Low', 'Normal', 'High', 'Emergency'],
            description: 'Session priority',
            default: 'Normal',
          },
          allowReboot: {
            type: 'boolean',
            description: 'Allow computer reboot if required',
            default: true,
          },
          description: {
            type: 'string',
            description: 'Session description/reason',
          },
        },
      },
    },
    {
      name: 'immybot_maintenance_sessions_cancel',
      description: 'Cancel a running or queued maintenance session (DESTRUCTIVE)',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID to cancel',
          },
          reason: {
            type: 'string',
            description: 'Reason for cancellation',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_pause',
      description: 'Pause a running maintenance session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID to pause',
          },
          reason: {
            type: 'string',
            description: 'Reason for pausing',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_resume',
      description: 'Resume a paused maintenance session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID to resume',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_logs',
      description: 'Get logs for a maintenance session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_results',
      description: 'Get results/tasks for a maintenance session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'number',
            description: 'Maintenance session ID',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'immybot_maintenance_sessions_active',
      description: 'Get all active (running) maintenance sessions',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'immybot_maintenance_sessions_summary',
      description: 'Get maintenance session summary/statistics',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'number',
            description: 'Filter by tenant ID',
          },
          startDate: {
            type: 'string',
            description: 'Start date for summary (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date for summary (ISO format)',
          },
        },
      },
    },
  ];
}

async function handleCall(
  toolName: string,
  args: Record<string, unknown>,
  extra?: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.debug('Maintenance Sessions tool called', { toolName, args });

  try {
    const client = await getClient();

    switch (toolName) {
      case 'immybot_maintenance_sessions_list': {
        const sessions = await client.maintenanceSessions.list(args as any);

        const summary = `Found ${sessions.length} maintenance sessions`;
        const detailedList = sessions.map(session =>
          `• Session ID ${session.id} - ${session.sessionType || 'Manual'}\n` +
          `  Computer: ${session.computerId} | Tenant: ${session.tenantId}\n` +
          `  Status: ${session.status} | Priority: ${session.priority || 'Normal'}\n` +
          `  Started: ${session.startedAt || 'Not started'} | Duration: ${session.duration || 'N/A'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `${summary}\n\n${detailedList}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_get': {
        const sessionId = args.sessionId as number;
        const session = await client.maintenanceSessions.get(sessionId);

        const details = [
          `Maintenance Session ID: ${session.id}`,
          `Type: ${session.sessionType || 'Manual'}`,
          `Computer ID: ${session.computerId}`,
          `Tenant ID: ${session.tenantId}`,
          `Status: ${session.status}`,
          `Priority: ${session.priority || 'Normal'}`,
          `Allow Reboot: ${session.allowReboot ? 'Yes' : 'No'}`,
          `Started: ${session.startedAt || 'Not started'}`,
          `Completed: ${session.completedAt || 'Not completed'}`,
          `Duration: ${session.duration || 'N/A'}`,
          `Description: ${session.description || 'No description'}`,
          `Progress: ${session.progress || 0}%`,
          `Tasks Completed: ${session.tasksCompleted || 0}`,
          `Tasks Failed: ${session.tasksFailed || 0}`,
          `Created: ${session.createdAt}`,
          `Updated: ${session.updatedAt}`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      case 'immybot_maintenance_sessions_start': {
        const computerId = args.computerId as number;
        const tenantId = args.tenantId as number;
        const sessionType = args.sessionType as string || 'Manual';

        if (!computerId && !tenantId) {
          return {
            content: [{
              type: 'text',
              text: 'Either computerId or tenantId must be specified to start a maintenance session'
            }],
            isError: true,
          };
        }

        const target = computerId ? `computer ${computerId}` : `all computers in tenant ${tenantId}`;

        // This is destructive - requires confirmation
        const confirmed = await elicitConfirmation(
          `Start maintenance session on ${target}`,
          `This will trigger immediate reconciliation of the desired state on ${target}. The session may install/uninstall software, apply configurations, and potentially reboot the target computer(s). This is a destructive operation that affects live systems.`,
          'high'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ CONFIRMATION REQUIRED: Start maintenance session on ${target}?\n\nThis will trigger immediate reconciliation of the desired state on ${target}. The session may install/uninstall software, apply configurations, and potentially reboot the target computer(s). This is a destructive operation that affects live systems.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        let session;
        if (computerId) {
          session = await client.maintenanceSessions.start({
            computerId,
            sessionType,
            priority: args.priority as any,
            allowReboot: args.allowReboot as boolean,
            description: args.description as string,
          });
        } else {
          const sessions = await client.maintenanceSessions.startForTenant(tenantId, sessionType);
          session = sessions[0]; // For display purposes, show the first session
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Started maintenance session on ${target}.\n\nSession ID: ${session.id}\nStatus: ${session.status}\nType: ${session.sessionType}\n\n⏳ Use immybot_maintenance_sessions_get with session ID ${session.id} to monitor progress.`
          }],
        };
      }

      case 'immybot_maintenance_sessions_cancel': {
        const sessionId = args.sessionId as number;
        const reason = args.reason as string;

        // Get session details for confirmation
        const session = await client.maintenanceSessions.get(sessionId);

        const confirmed = await elicitConfirmation(
          `Cancel maintenance session ${sessionId}`,
          `This will cancel the running/queued maintenance session on computer ${session.computerId}. Any in-progress tasks will be stopped, but completed changes will remain. This may leave the system in a partially configured state.`,
          'medium'
        );

        if (confirmed === null) {
          return {
            content: [{
              type: 'text',
              text: `⚠️ CONFIRMATION REQUIRED: Cancel maintenance session ${sessionId}?\n\nThis will cancel the running/queued maintenance session on computer ${session.computerId}. Any in-progress tasks will be stopped, but completed changes will remain. This may leave the system in a partially configured state.\n\nPlease confirm this action before proceeding.`
            }],
          };
        }

        const cancelledSession = await client.maintenanceSessions.cancel(sessionId, reason);

        return {
          content: [{
            type: 'text',
            text: `✅ Cancelled maintenance session ${sessionId}.\n\nStatus: ${cancelledSession.status}\nReason: ${reason || 'No reason provided'}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_pause': {
        const sessionId = args.sessionId as number;
        const reason = args.reason as string;

        const pausedSession = await client.maintenanceSessions.pause(sessionId, reason);

        return {
          content: [{
            type: 'text',
            text: `✅ Paused maintenance session ${sessionId}.\n\nStatus: ${pausedSession.status}\nReason: ${reason || 'No reason provided'}\n\nUse immybot_maintenance_sessions_resume to continue the session.`
          }],
        };
      }

      case 'immybot_maintenance_sessions_resume': {
        const sessionId = args.sessionId as number;

        const resumedSession = await client.maintenanceSessions.resume(sessionId);

        return {
          content: [{
            type: 'text',
            text: `✅ Resumed maintenance session ${sessionId}.\n\nStatus: ${resumedSession.status}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_logs': {
        const sessionId = args.sessionId as number;
        const logs = await client.maintenanceSessions.getLogs(sessionId);

        if (logs.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No logs found for maintenance session ${sessionId}`
            }],
          };
        }

        const logList = logs.slice(0, 20).map(log => // Show latest 20 logs
          `[${log.timestamp}] ${log.level}: ${log.message}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Logs for maintenance session ${sessionId} (latest 20 entries):\n\n${logList}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_results': {
        const sessionId = args.sessionId as number;
        const results = await client.maintenanceSessions.getResults(sessionId);

        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results/tasks found for maintenance session ${sessionId}`
            }],
          };
        }

        const resultList = results.map(result =>
          `• Task ${result.id}: ${result.name || 'Unnamed task'}\n` +
          `  Status: ${result.status} | Type: ${result.taskType}\n` +
          `  Started: ${result.startedAt} | Completed: ${result.completedAt || 'In progress'}\n` +
          `  Result: ${result.result || 'No result'}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Results for maintenance session ${sessionId}:\n\n${resultList}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_active': {
        const activeSessions = await client.maintenanceSessions.getActive();

        if (activeSessions.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No active maintenance sessions found'
            }],
          };
        }

        const sessionList = activeSessions.map(session =>
          `• Session ${session.id} - Computer ${session.computerId}\n` +
          `  Status: ${session.status} | Progress: ${session.progress || 0}%\n` +
          `  Started: ${session.startedAt} | Type: ${session.sessionType}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Active maintenance sessions:\n\n${sessionList}`
          }],
        };
      }

      case 'immybot_maintenance_sessions_summary': {
        const summary = await client.maintenanceSessions.getSummary(args as any);

        const details = [
          `Maintenance Session Summary:`,
          `• Total Sessions: ${summary.totalSessions}`,
          `• Successful Sessions: ${summary.successfulSessions}`,
          `• Failed Sessions: ${summary.failedSessions}`,
          `• Average Duration: ${summary.averageDuration}`,
          `• Success Rate: ${summary.successRate}%`,
          `• Total Tasks Executed: ${summary.totalTasks}`,
          `• Tasks Success Rate: ${summary.taskSuccessRate}%`,
        ].join('\n');

        return {
          content: [{ type: 'text', text: details }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown maintenance sessions tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    logger.error('Maintenance Sessions tool error', { toolName, error: error.message });

    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
}

export const maintenanceSessionsHandler: DomainHandler = { getTools, handleCall };